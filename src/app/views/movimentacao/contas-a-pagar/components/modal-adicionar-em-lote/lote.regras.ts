import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ContaDto } from 'src/app/core/models/conta.model';
import { TransacaoPayload } from 'src/app/core/models/conta-mensal.model';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { AparenciaCategoria, aparenciaDe, iconeDe } from 'src/app/shared/ui/aparencia';
import { normalizarNome } from 'src/app/shared/utils/nomes-parecidos';
import { ehReceita } from 'src/app/views/cadastro/categoria/categorias.regras';
import { diasDaConta, textoVencimento } from 'src/app/views/cadastro/conta-mensal/contas.regras';

/**
 * Regras do "Adicionar contas em lote" (card #48), sem Angular. O valor e os dias ajustados na linha valem só
 * para o lançamento deste mês (valorDoMes / diasVencimento na API); o cadastro da conta não muda.
 * "Hoje" vem de fora para os testes.
 */

/** disponível: dá para lançar; inválida: falta valor ou dia (corrigível na linha); lançada e inativa: desabilitadas. */
export type SituacaoLote = 'disponivel' | 'lancada' | 'inativa' | 'invalida';
export type FiltroLote = 'disponiveis' | 'lancadas' | 'todas';

export interface VencimentoLote {
  dias: string;
  relativo: string;
  tom: 'vermelho' | 'laranja' | 'neutro';
}

export interface LinhaLote {
  conta: ContaDto;
  aparencia: AparenciaCategoria;
  icone: string;
  receita: boolean;
  /** Valor deste mês: o da conta até alguém mudar. */
  valor: number;
  /** Dias deste mês: os do cadastro, ou os informados quando a conta não tem. */
  dias: number[];
  vencimento: VencimentoLote | null;
  /** "Parcela 4 de 10"; null se não é parcelada. */
  parcela: string | null;
  situacao: SituacaoLote;
  /** Por que a linha é inválida ("Informe o valor"…); null nas outras. */
  motivo: string | null;
}

export interface CriterioLote {
  filtro: FiltroLote;
  busca: string;
  /** Ids de categoria; vazio = todas. */
  categorias: number[];
}

export interface TotaisLote {
  quantidade: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

/** Até quantos dias antes o vencimento fica em destaque (laranja), como em Contas a Pagar. */
const DIAS_EM_DESTAQUE = 7;
const UM_DIA_MS = 86_400_000;

const centavos = (valor: number) => Math.round(valor * 100) / 100;

function mesDoLote(mes: string): { ano: number; mes: number } {
  const [ano, numero] = mes.split('-').map(Number);
  return { ano, mes: numero - 1 };
}

/** Pelo primeiro dia do mês do lote; dia além do fim do mês cai no último, como na API. */
function vencimentoDe(dias: number[], mes: string, hoje: Date): VencimentoLote | null {
  if (!dias.length) return null;
  const { ano, mes: m } = mesDoLote(mes);
  const ultimoDia = new Date(ano, m + 1, 0).getDate();
  const primeiro = new Date(ano, m, Math.min(Math.min(...dias), ultimoDia));
  const inicioDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const faltam = Math.round((primeiro.getTime() - inicioDeHoje.getTime()) / UM_DIA_MS);

  const texto = textoVencimento(dias).replace('Todo dia', 'Dia');
  if (faltam < 0) return { dias: texto, relativo: 'já venceu', tom: 'vermelho' };
  if (faltam === 0) return { dias: texto, relativo: 'vence hoje', tom: 'laranja' };
  return {
    dias: texto,
    relativo: faltam === 1 ? 'vence amanhã' : `vence em ${faltam} dias`,
    tom: faltam <= DIAS_EM_DESTAQUE ? 'laranja' : 'neutro'
  };
}

function parcelaDe(conta: ContaDto): string | null {
  if (!conta.ehParcelado) return null;
  return `Parcela ${Math.max(1, conta.parcelaAtual)} de ${conta.quantidadeParcelas}`;
}

/** Inativa e lançada vêm antes: não importa o valor de uma linha que não se escolhe. */
function situacaoDe(linha: Omit<LinhaLote, 'situacao' | 'motivo'>, lancadas: number): Pick<LinhaLote, 'situacao' | 'motivo'> {
  const { conta } = linha;
  if (!conta.ativo) return { situacao: 'inativa', motivo: null };
  if (lancadas > 0 && lancadas >= Math.max(1, diasDaConta(conta).length)) return { situacao: 'lancada', motivo: null };
  if (conta.ehParcelado && Math.max(1, conta.parcelaAtual) > conta.quantidadeParcelas)
    return { situacao: 'invalida', motivo: 'Parcelas concluídas' };
  if (!(linha.valor > 0)) return { situacao: 'invalida', motivo: 'Informe o valor' };
  if (!linha.dias.length) return { situacao: 'invalida', motivo: 'Informe o dia' };
  return { situacao: 'disponivel', motivo: null };
}

/** Quantos lançamentos de cada conta o mês já tem (cada vencimento vira um). */
function lancadasPorConta(lancamentos: readonly { contaId?: number | null }[]): Map<number, number> {
  const mapa = new Map<number, number>();
  for (const { contaId } of lancamentos) {
    if (contaId) mapa.set(contaId, (mapa.get(contaId) ?? 0) + 1);
  }
  return mapa;
}

const porNome = (a: LinhaLote, b: LinhaLote) =>
  normalizarNome(a.conta.nome).localeCompare(normalizarNome(b.conta.nome), 'pt-BR');

/** Uma linha por conta (ativas e inativas), em ordem alfabética sem acento. `mes` = "YYYY-MM". */
export function montarLinhas(
  contas: readonly ContaDto[],
  lancamentosDoMes: readonly { contaId?: number | null }[],
  categorias: readonly CategoriaDto[],
  mes: string,
  hoje: Date
): LinhaLote[] {
  const porCategoria = new Map(categorias.map(c => [c.id, c]));
  const lancadas = lancadasPorConta(lancamentosDoMes);
  return contas
    .map(conta => {
      const categoria = porCategoria.get(conta.categoriaId);
      const dias = diasDaConta(conta);
      const base = {
        conta,
        aparencia: categoria ? aparenciaDe(categoria) : { natureza: null },
        icone: iconeDe(categoria ?? { nome: conta.categoriaNome }),
        receita: !!categoria && ehReceita(categoria),
        valor: conta.valor,
        dias,
        vencimento: vencimentoDe(dias, mes, hoje),
        parcela: parcelaDe(conta)
      };
      return { ...base, ...situacaoDe(base, lancadas.get(conta.id) ?? 0) };
    })
    .sort(porNome);
}

/** Valor ou dias mudados na linha: recalcula vencimento e situação. Só linhas escolhíveis chegam aqui. */
export function ajustarLinha(linha: LinhaLote, ajuste: { valor?: number | null; dias?: number[] }, mes: string, hoje: Date): LinhaLote {
  const valor = ajuste.valor !== undefined ? ajuste.valor ?? 0 : linha.valor;
  const dias = ajuste.dias ? [...ajuste.dias].sort((a, b) => a - b) : linha.dias;
  const base = { ...linha, valor, dias, vencimento: vencimentoDe(dias, mes, hoje) };
  return { ...base, ...situacaoDe(base, 0) };
}

const PASSA_FILTRO: Record<FiltroLote, (linha: LinhaLote) => boolean> = {
  disponiveis: l => l.situacao === 'disponivel' || l.situacao === 'invalida',
  lancadas: l => l.situacao === 'lancada',
  todas: () => true
};

function passaSemFiltro(linha: LinhaLote, criterio: Omit<CriterioLote, 'filtro'>, busca: string): boolean {
  const { conta } = linha;
  return (!criterio.categorias.length || criterio.categorias.includes(conta.categoriaId))
    && (!busca || normalizarNome(conta.nome).includes(busca) || normalizarNome(conta.categoriaNome).includes(busca));
}

export function filtrarLinhas(linhas: readonly LinhaLote[], criterio: CriterioLote): LinhaLote[] {
  const busca = normalizarNome(criterio.busca);
  return linhas.filter(l => PASSA_FILTRO[criterio.filtro](l) && passaSemFiltro(l, criterio, busca));
}

/** Contadores do seletor Disponíveis / Já lançadas / Todas, com a busca e as categorias aplicadas. */
export function contarPorFiltro(linhas: readonly LinhaLote[], criterio: Omit<CriterioLote, 'filtro'>): Record<FiltroLote, number> {
  const busca = normalizarNome(criterio.busca);
  const base = linhas.filter(l => passaSemFiltro(l, criterio, busca));
  return {
    disponiveis: base.filter(PASSA_FILTRO.disponiveis).length,
    lancadas: base.filter(PASSA_FILTRO.lancadas).length,
    todas: base.length
  };
}

/** Rodapé: o que entra no mês com as selecionadas. */
export function totaisDoLote(selecionadas: readonly LinhaLote[]): TotaisLote {
  const soma = (lista: readonly LinhaLote[]) => centavos(lista.reduce((total, l) => total + l.valor, 0));
  const receitas = soma(selecionadas.filter(l => l.receita));
  const despesas = soma(selecionadas.filter(l => !l.receita));
  return { quantidade: selecionadas.length, receitas, despesas, saldo: centavos(receitas - despesas) };
}

/**
 * Corpo do /CreateTransaction. A API calcula a parcela e divide o valor entre os dias; valorDoMes e
 * diasVencimento só vão quando a linha foi ajustada. Valor fixo chega aguardando pagamento (card #47).
 */
export function payloadDaLinha(linha: LinhaLote, mes: string): TransacaoPayload {
  const { conta } = linha;
  const diasMudaram = linha.dias.join(',') !== diasDaConta(conta).join(',');
  return {
    data: formatDateVencimento(mes, '01'),
    nome: conta.nome,
    contaId: conta.id,
    valor: conta.valor,
    situacao: conta.valorFixo ? 'AGUARDANDO' : 'PENDENTE',
    ehParcelado: conta.ehParcelado,
    ...(linha.valor !== conta.valor ? { valorDoMes: linha.valor } : {}),
    ...(diasMudaram ? { diasVencimento: linha.dias } : {})
  };
}
