import { BancoDto } from 'src/app/core/models/banco.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { normalizarNome } from 'src/app/shared/utils/nomes-parecidos';

/**
 * Regras da tela de Extrato no layout novo (card #45, parte 1), sem Angular: a tela, os cards do celular e os specs
 * usam as mesmas. Uma "conta" é um registro de Banco (que já guarda o tipo: corrente, crédito…), como no resumo antigo.
 */

/** "Entrada" ou "ENTRADA" (gravado pela API); o resto é saída. */
export function ehEntrada(item: Pick<ExtratoItemDto, 'tipoLancamento'>): boolean {
  return normalizarNome(item.tipoLancamento) === 'entrada';
}

/** Nem vínculo com pessoa cadastrada nem nome digitado. */
export function semPessoa(item: Pick<ExtratoItemDto, 'pessoaMovimentacaoId' | 'nomePessoaTransacao'>): boolean {
  return !item.pessoaMovimentacaoId && !item.nomePessoaTransacao?.trim();
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

export interface ContaDoMes {
  bancoId: number;
  nome: string;
  tipoNome: string;
  ehCredito: boolean;
  entradas: number;
  saidas: number;
  quantidade: number;
}

/** Contas da lista à esquerda: os bancos ativos e os inativos que tiveram lançamento no mês, em ordem de nome. */
export function contasDoMes(itens: readonly ExtratoItemDto[], bancos: readonly BancoDto[], tipos: readonly TipoCartaoDto[]): ContaDoMes[] {
  const tipoPorId = new Map(tipos.map(t => [t.id, t]));
  return bancos
    .map(banco => {
      const daConta = itens.filter(i => i.bancoId === banco.id);
      const tipo = banco.tipoCartaoId != null ? tipoPorId.get(banco.tipoCartaoId) : undefined;
      return {
        conta: {
          bancoId: banco.id,
          nome: banco.nomeBanco,
          tipoNome: tipo?.nomeTipoCartao ?? '',
          ehCredito: tipo?.ehCredito === true,
          entradas: centavos(daConta.filter(ehEntrada).reduce((s, i) => s + Number(i.valor), 0)),
          saidas: centavos(daConta.filter(i => !ehEntrada(i)).reduce((s, i) => s + Number(i.valor), 0)),
          quantidade: daConta.length
        },
        ativo: banco.ativo !== false
      };
    })
    .filter(({ conta, ativo }) => ativo || conta.quantidade > 0)
    .map(({ conta }) => conta)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export type TipoFiltro = 'todos' | 'saidas' | 'entradas';
/** O que os cards "Sem pessoa" e "Sem categoria" filtram. */
export type Pendencia = 'sem-pessoa' | 'sem-categoria';

export interface FiltroExtrato {
  /** null = todas as contas. */
  bancoId: number | null;
  tipo: TipoFiltro;
  busca: string;
  /** Nomes de pessoa (o que aparece no chip); vazio = todas. */
  pessoas: string[];
  /** Ids de categoria; vazio = todas. */
  categorias: number[];
  pendencia: Pendencia | null;
}

/** Nome mostrado no chip: o da pessoa cadastrada ou o digitado. */
export function nomeDaPessoa(item: ExtratoItemDto): string {
  return (item.pessoaMovimentacao?.nomePessoa ?? item.nomePessoaTransacao ?? '').trim();
}

/** Do dia mais recente para o mais antigo; no mesmo dia, o último lançado primeiro. */
function maisRecentePrimeiro(a: ExtratoItemDto, b: ExtratoItemDto): number {
  return b.dataMovimentacao.localeCompare(a.dataMovimentacao) || b.id - a.id;
}

export function filtrarExtrato(itens: readonly ExtratoItemDto[], filtro: FiltroExtrato): ExtratoItemDto[] {
  const busca = normalizarNome(filtro.busca);
  const pessoas = filtro.pessoas.map(normalizarNome);
  return itens
    .filter(i => filtro.bancoId === null || i.bancoId === filtro.bancoId)
    .filter(i => filtro.tipo === 'todos' || (filtro.tipo === 'entradas') === ehEntrada(i))
    .filter(i => !busca || normalizarNome(i.descricao).includes(busca) || normalizarNome(nomeDaPessoa(i)).includes(busca))
    .filter(i => !pessoas.length || pessoas.includes(normalizarNome(nomeDaPessoa(i))))
    .filter(i => !filtro.categorias.length || (i.categoriaId != null && filtro.categorias.includes(i.categoriaId)))
    .filter(i => filtro.pendencia !== 'sem-pessoa' || (!ehEntrada(i) && semPessoa(i)))
    .filter(i => filtro.pendencia !== 'sem-categoria' || i.categoriaId == null)
    .sort(maisRecentePrimeiro);
}

export interface CardsExtrato {
  saidas: number;
  entradas: number;
  /** Saídas sem pessoa (entradas como salário não precisam de pessoa). */
  semPessoa: number;
  semCategoria: number;
}

export function cardsDoExtrato(itens: readonly ExtratoItemDto[]): CardsExtrato {
  return {
    saidas: centavos(itens.filter(i => !ehEntrada(i)).reduce((s, i) => s + Number(i.valor), 0)),
    entradas: centavos(itens.filter(ehEntrada).reduce((s, i) => s + Number(i.valor), 0)),
    semPessoa: itens.filter(i => !ehEntrada(i) && semPessoa(i)).length,
    semCategoria: itens.filter(i => i.categoriaId == null).length
  };
}

export interface GrupoDoDia {
  /** "YYYY-MM-DD". */
  data: string;
  /** "5 de outubro, segunda-feira". */
  titulo: string;
  /** Entradas − saídas do dia. */
  saldo: number;
  itens: ExtratoItemDto[];
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_DA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** Agrupa na ordem em que vieram (já filtrados e ordenados). */
export function agruparPorDia(itens: readonly ExtratoItemDto[]): GrupoDoDia[] {
  const grupos: GrupoDoDia[] = [];
  for (const item of itens) {
    let grupo = grupos[grupos.length - 1];
    if (grupo?.data !== item.dataMovimentacao) {
      const [ano, mes, dia] = item.dataMovimentacao.split('-').map(Number);
      const semana = DIAS_DA_SEMANA[new Date(ano, mes - 1, dia).getDay()];
      grupo = { data: item.dataMovimentacao, titulo: `${dia} de ${MESES[mes - 1]}, ${semana}`, saldo: 0, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(item);
    grupo.saldo = centavos(grupo.saldo + (ehEntrada(item) ? 1 : -1) * Number(item.valor));
  }
  return grupos;
}

/** Campos que o Modo edição deixa mudar. */
const CAMPOS_EDITAVEIS = [
  'dataMovimentacao', 'descricao', 'nomePessoaTransacao', 'pessoaMovimentacaoId', 'categoriaId', 'tipoMovimentacaoId',
  'valor', 'parcelaAtual', 'quantidadeParcelas'
] as const;

/** Modo edição: os lançamentos do rascunho com algum campo editável diferente do original. */
export function alteracoesDoRascunho(originais: readonly ExtratoItemDto[], rascunho: Record<number, ExtratoItemDto>): ExtratoItemDto[] {
  return originais
    .map(original => ({ original, editado: rascunho[original.id] }))
    // A data compara só o dia: o rascunho guarda AAAA-MM-DD e a API manda com horário.
    .filter(({ original, editado }) => editado && CAMPOS_EDITAVEIS.some(campo => campoAlterado(original, editado, campo)))
    .map(({ editado }) => editado);
}

/** Tipo dos campos editáveis, para marcar a célula mexida no Modo edição. */
export type CampoEditavel = typeof CAMPOS_EDITAVEIS[number];

/** Modo edição: uma cópia de cada lançamento, com a data no formato do campo (AAAA-MM-DD). */
export function rascunhoDe(itens: readonly ExtratoItemDto[]): Record<number, ExtratoItemDto> {
  return Object.fromEntries(itens.map(i => [i.id, { ...i, dataMovimentacao: (i.dataMovimentacao ?? '').slice(0, 10) }]));
}

/** O campo do lançamento foi mexido no rascunho (a data compara só o dia). */
export function campoAlterado(original: ExtratoItemDto | undefined, editado: ExtratoItemDto | undefined, campo: CampoEditavel): boolean {
  if (!original || !editado) return false;
  const de = campo === 'dataMovimentacao' ? (original.dataMovimentacao ?? '').slice(0, 10) : original[campo] ?? null;
  return (editado[campo] ?? null) !== (de ?? null);
}

/**
 * Pessoa digitada no Modo edição: com nome de pessoa cadastrada, liga o lançamento a ela; sem, fica só o nome
 * (como no detalhe antigo). Vazio tira a pessoa.
 */
export function aplicarPessoa(item: ExtratoItemDto, nome: string, pessoas: readonly { id: number; nomePessoa: string }[]): ExtratoItemDto {
  const limpo = nome.trim();
  if (!limpo) return { ...item, nomePessoaTransacao: null, pessoaMovimentacaoId: null };
  const pessoa = pessoas.find(p => normalizarNome(p.nomePessoa) === normalizarNome(limpo));
  return { ...item, nomePessoaTransacao: pessoa?.nomePessoa ?? limpo, pessoaMovimentacaoId: pessoa?.id ?? null };
}
