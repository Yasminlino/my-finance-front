import { BancoDto } from 'src/app/core/models/banco.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { normalizarNome } from 'src/app/shared/utils/nomes-parecidos';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

/**
 * Regras da tela de Extrato no layout novo (card #45, parte 1), sem Angular: a tela, os cards do celular e os specs
 * usam as mesmas. Uma "conta" é um registro de Banco (que já guarda o tipo: corrente, crédito…), como no resumo antigo.
 */

/** "Entrada" ou "ENTRADA" (gravado pela API); o resto é saída. */
export function ehEntrada(item: Pick<ExtratoItemDto, 'tipoLancamento'>): boolean {
  return normalizarNome(item.tipoLancamento) === 'entrada';
}

/** Nem vínculo com pessoa cadastrada nem nome digitado. */
export function semPessoa(item: Pick<ExtratoItemDto, 'pessoaMovimentacaoId'>): boolean {
  // Card #79: o nome do extrato ("CIRCUITO") não é pessoa; pessoa é só a cadastrada.
  return !item.pessoaMovimentacaoId;
}

/**
 * Card #79: a parte de pessoas (lista, coluna, Acertos, pessoa nas regras e no Dividir) só aparece para quem empresta
 * cartão — algum cartão marcado "Outras pessoas usam este cartão".
 */
export function usaPessoas(bancos: readonly Pick<BancoDto, 'compartilhado'>[]): boolean {
  return bancos.some(b => b.compartilhado === true);
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** Lançamento dividido em partes (card #76, fase 3). */
export function dividido(item: Pick<ExtratoItemDto, 'partes'>): boolean {
  return !!item.partes?.length;
}

/** Sem categoria: dividido, conta se alguma parte ficou sem. */
export function semCategoria(item: Pick<ExtratoItemDto, 'categoriaId' | 'partes'>): boolean {
  return dividido(item) ? item.partes!.some(p => !p.categoriaId) : item.categoriaId == null;
}

/** Para relatórios: cada parte vale como um lançamento da categoria dela. Só leitura. */
export function expandirPartes(itens: readonly ExtratoItemDto[]): ExtratoItemDto[] {
  return itens.flatMap(item => !dividido(item) ? [item] : item.partes!.map(p => ({
    ...item,
    valor: Number(p.valor),
    categoriaId: p.categoriaId ?? null,
    categoriaNome: p.categoriaNome ?? null,
    categoria: p.categoriaId
      ? { id: p.categoriaId, nome: p.categoriaNome ?? '', subcategoria: '', naturezaOperacao: p.categoriaNaturezaOperacao ?? undefined } as ExtratoItemDto['categoria']
      : null,
    partes: []
  })));
}

/** "10/11": o dia de vencimento no mês (AAAA-MM), limitado ao último dia; vazio sem o dia cadastrado. */
export function vencimentoNoMes(dia: number | null | undefined, mes: string): string {
  if (!dia) return '';
  const [ano, numero] = mes.split('-').map(Number);
  return `${String(Math.min(dia, new Date(ano, numero, 0).getDate())).padStart(2, '0')}/${String(numero).padStart(2, '0')}`;
}

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
  /** Faixa de valor, como em Contas a Pagar; null ou ausente = sem limite. */
  valorMin?: number | null;
  valorMax?: number | null;
  /** Só os lançamentos desta importação (card #75). */
  importacaoId?: number | null;
}

/** "Ordenar por", como em Contas a Pagar; data (mais recente primeiro) é o padrão. */
export type OrdemExtrato = 'data' | 'entradas' | 'valor' | 'nome';

export const OPCOES_ORDEM_EXTRATO: { label: string; value: OrdemExtrato }[] = [
  { label: 'Data', value: 'data' },
  { label: 'Entradas primeiro', value: 'entradas' },
  { label: 'Maior valor', value: 'valor' },
  { label: 'Nome', value: 'nome' }
];

/** Nome gravado da pessoa "Eu" (a API grava os nomes em maiúsculas). */
export const NOME_TITULAR = 'EU';
/** Como a pessoa "Eu" aparece na tela. */
export const ROTULO_TITULAR = 'Eu';

type PessoaResumo = { id: number; nomePessoa: string; ehTitular?: boolean };

/** O lançamento é do "Eu": pelo vínculo que veio da API ou pelo nome gravado. */
export function ehDoTitular(item: ExtratoItemDto): boolean {
  if (!item.pessoaMovimentacaoId && !item.pessoaMovimentacao) return false;
  return item.pessoaMovimentacao?.ehTitular === true
    || normalizarNome(item.pessoaMovimentacao?.nomePessoa) === normalizarNome(NOME_TITULAR);
}

/** Nome mostrado no chip: o da pessoa cadastrada (nunca o nome do extrato); a titular aparece como "Eu". */
export function nomeDaPessoa(item: ExtratoItemDto): string {
  if (ehDoTitular(item)) return ROTULO_TITULAR;
  return item.pessoaMovimentacaoId || item.pessoaMovimentacao ? (item.pessoaMovimentacao?.nomePessoa ?? '').trim() : '';
}

/** Sugestões do campo Pessoa: "Eu" primeiro, depois as outras em ordem alfabética. */
export function nomesParaSugestao(pessoas: readonly PessoaResumo[]): string[] {
  const outras = [...new Set(pessoas.filter(p => !p.ehTitular).map(p => p.nomePessoa).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return pessoas.some(p => p.ehTitular) ? [ROTULO_TITULAR, ...outras] : outras;
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
    .filter(i => filtro.importacaoId == null || i.extratoBancarioId === filtro.importacaoId)
    .filter(i => filtro.tipo === 'todos' || (filtro.tipo === 'entradas') === ehEntrada(i))
    .filter(i => !busca || normalizarNome(i.descricao).includes(busca) || normalizarNome(nomeDaPessoa(i)).includes(busca)
      || normalizarNome(i.nomePessoaTransacao).includes(busca)
      || !!i.itensNota?.some(n => normalizarNome(n).includes(busca)))
    .filter(i => !pessoas.length || pessoas.includes(normalizarNome(nomeDaPessoa(i)))
      || !!i.partes?.some(p => pessoas.includes(normalizarNome(p.pessoaNome))))
    .filter(i => !filtro.categorias.length || (i.categoriaId != null && filtro.categorias.includes(i.categoriaId))
      || !!i.partes?.some(p => p.categoriaId != null && filtro.categorias.includes(p.categoriaId)))
    .filter(i => filtro.pendencia !== 'sem-pessoa' || (!ehEntrada(i) && semPessoa(i)))
    .filter(i => filtro.pendencia !== 'sem-categoria' || semCategoria(i))
    .filter(i => filtro.valorMin == null || Number(i.valor) >= filtro.valorMin)
    .filter(i => filtro.valorMax == null || Number(i.valor) <= filtro.valorMax)
    .sort(maisRecentePrimeiro);
}

/** O nome usado em "Ordenar por: Nome": a pessoa/estabelecimento ou, sem ele, a descrição. */
/** "Nome" ordena pelo nome que veio no extrato (o estabelecimento), senão pela descrição. */
const nomeParaOrdem = (i: ExtratoItemDto) => (i.nomePessoaTransacao ?? '').trim() || (i.descricao ?? '').trim();

/** "Ordenar por". Devolve uma cópia; no empate fica a data mais recente (a ordem em que vieram). */
export function ordenarExtrato(itens: readonly ExtratoItemDto[], ordem: OrdemExtrato): ExtratoItemDto[] {
  const copia = [...itens];
  switch (ordem) {
    case 'entradas': return copia.sort((a, b) => Number(ehEntrada(b)) - Number(ehEntrada(a)));
    case 'valor': return copia.sort((a, b) => Number(b.valor) - Number(a.valor));
    case 'nome': return copia.sort((a, b) => nomeParaOrdem(a).localeCompare(nomeParaOrdem(b), 'pt-BR'));
    default: return copia;
  }
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
    semCategoria: itens.filter(semCategoria).length
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

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const SEMANA_CURTA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

/** Título do dia no celular: "22 OUT · QUINTA". */
export function tituloCurtoDoDia(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return `${dia} ${MESES_CURTOS[mes - 1]} · ${SEMANA_CURTA[new Date(ano, mes - 1, dia).getDay()]}`;
}

/** Fora da ordem por data os dias não fazem sentido: um grupo só, na ordem pedida. */
export function grupoUnico(itens: readonly ExtratoItemDto[], titulo: string): GrupoDoDia[] {
  if (!itens.length) return [];
  const saldo = centavos(itens.reduce((s, i) => s + (ehEntrada(i) ? 1 : -1) * Number(i.valor), 0));
  return [{ data: 'ordenado', titulo, saldo, itens: [...itens] }];
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
 * Pessoa escolhida no lançamento (card #79): só pelo id, de uma pessoa cadastrada; null tira a pessoa. O nome do extrato
 * ("CIRCUITO") e a categoria não mudam.
 */
export function aplicarPessoa(item: ExtratoItemDto, pessoaId: number | null, pessoas: readonly PessoaResumo[]): ExtratoItemDto {
  const pessoa = pessoaId == null ? undefined : pessoas.find(p => p.id === pessoaId);
  return {
    ...item,
    pessoaMovimentacaoId: pessoa?.id ?? null,
    pessoaMovimentacao: pessoa ? { id: pessoa.id, nomePessoa: pessoa.nomePessoa, ehTitular: pessoa.ehTitular, categoriaId: null, tipoMovimentacaoId: null } : null,
    alteraVinculoPessoa: true
  };
}

/** Opções do campo Pessoa: "Eu" primeiro, depois as outras em ordem alfabética. */
export function opcoesDePessoa(pessoas: readonly PessoaResumo[]): { label: string; value: number }[] {
  const outras = pessoas.filter(p => !p.ehTitular)
    .map(p => ({ label: p.nomePessoa, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const eu = pessoas.find(p => p.ehTitular);
  return eu ? [{ label: ROTULO_TITULAR, value: eu.id }, ...outras] : outras;
}

export type FaturaPorPessoa = {
  total: number;
  /** Eu e sem pessoa. */
  minhas: number;
  outras: number;
  porPessoa: { pessoaId: number; nome: string; valor: number }[];
};

/**
 * Card "Fatura dividida por pessoa" (card #45, parte 3): as saídas da fatura separadas entre as minhas e as das outras
 * pessoas (toda pessoa cadastrada menos o "Eu", card #79), com quanto é de cada uma (maior primeiro). Entradas
 * (estorno, pagamento) não contam.
 */
export function faturaPorPessoa(itens: readonly ExtratoItemDto[], pessoas: readonly PessoaResumo[]): FaturaPorPessoa {
  const dosAcertos = new Map(pessoas.filter(p => !p.ehTitular).map(p => [p.id, p.nomePessoa]));
  const saidas = itens.filter(i => !ehEntrada(i));
  const porPessoa = new Map<number, number>();
  let minhas = 0;
  const pedacos = saidas.flatMap(i => dividido(i)
    ? i.partes!.map(p => ({ id: p.pessoaMovimentacaoId ?? null, valor: Number(p.valor) }))
    : [{ id: i.pessoaMovimentacaoId ?? null, valor: Number(i.valor) }]);
  for (const { id, valor } of pedacos) {
    if (id != null && dosAcertos.has(id)) porPessoa.set(id, (porPessoa.get(id) ?? 0) + valor);
    else minhas += valor;
  }
  const lista = [...porPessoa.entries()]
    .map(([pessoaId, valor]) => ({ pessoaId, nome: dosAcertos.get(pessoaId)!, valor: centavos(valor) }))
    .sort((a, b) => b.valor - a.valor);
  const outras = centavos(lista.reduce((s, p) => s + p.valor, 0));
  return { total: centavos(minhas + outras), minhas: centavos(minhas), outras, porPessoa: lista };
}

/** Valor com sinal, espaçado igual nos dois lados (card #81): "+ R$ 150,00", "- R$ 75,76", "R$ 0,00". */
export function moedaComSinal(v: number): string {
  if (!v) return formatCurrencyBR(0);
  return `${v > 0 ? '+' : '-'} ${formatCurrencyBR(Math.abs(v))}`;
}
