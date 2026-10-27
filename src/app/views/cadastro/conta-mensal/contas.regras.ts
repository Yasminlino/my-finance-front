import { ContaDto, LancamentoDaConta } from 'src/app/core/models/conta.model';
import { normalizarNome } from 'src/app/shared/utils/nomes-parecidos';

/**
 * Regras do Cadastro de Contas (card #22), sem Angular: a lista, o formulário e os specs usam as mesmas.
 * O valor da conta é o total do mês, dividido entre os dias de vencimento (TransacaoService na API).
 */

export type FiltroSituacao = 'ativas' | 'inativas' | 'todas';
/** "Ordenar por" da lista; `vencimento` = pelo primeiro dia (padrão). */
export type OrdemContas = 'vencimento' | 'nome' | 'valor' | 'categoria';

export interface FiltroContas {
  situacao: FiltroSituacao;
  busca: string;
  /** Ids de categoria; vazio = todas. */
  categorias: number[];
  ordem: OrdemContas;
}

/** Dias de vencimento da conta, em ordem. */
export function diasDaConta(conta: Pick<ContaDto, 'vencimentos'>): number[] {
  return (conta.vencimentos ?? []).map(v => v.dia).sort((a, b) => a - b);
}

/** "Todo dia 11", "Dias 5 e 20", "Dias 5, 15 e 25". */
export function textoVencimento(dias: readonly number[]): string {
  const ordenados = [...dias].sort((a, b) => a - b);
  if (!ordenados.length) return 'Sem vencimento';
  if (ordenados.length === 1) return `Todo dia ${ordenados[0]}`;
  return `Dias ${ordenados.slice(0, -1).join(', ')} e ${ordenados[ordenados.length - 1]}`;
}

function passaSituacao(conta: ContaDto, situacao: FiltroSituacao): boolean {
  return situacao === 'todas' || conta.ativo === (situacao === 'ativas');
}

/** Tudo do filtro, menos a situação: é a base dos contadores do seletor Ativas / Inativas / Todas. */
function passaSemSituacao(conta: ContaDto, filtro: FiltroContas, busca: string): boolean {
  return (!filtro.categorias.length || filtro.categorias.includes(conta.categoriaId))
    && (!busca || normalizarNome(conta.nome).includes(busca) || normalizarNome(conta.categoriaNome).includes(busca));
}

const porNome = (a: ContaDto, b: ContaDto) => a.nome.localeCompare(b.nome, 'pt-BR');
/** Sem vencimento vai para o fim na ordem por dia. */
const primeiroDia = (conta: ContaDto) => diasDaConta(conta)[0] ?? 32;

/** Critério principal de cada ordem; o empate cai no nome (A–Z). */
const ORDENAR: Record<OrdemContas, (a: ContaDto, b: ContaDto) => number> = {
  vencimento: (a, b) => primeiroDia(a) - primeiroDia(b),
  nome: () => 0,
  valor: (a, b) => b.valor - a.valor,
  categoria: (a, b) => (a.categoriaNome ?? '').localeCompare(b.categoriaNome ?? '', 'pt-BR')
};

export function filtrarContas(contas: readonly ContaDto[], filtro: FiltroContas): ContaDto[] {
  const busca = normalizarNome(filtro.busca);
  return contas
    .filter(c => passaSituacao(c, filtro.situacao) && passaSemSituacao(c, filtro, busca))
    .sort((a, b) => ORDENAR[filtro.ordem](a, b) || porNome(a, b));
}

export function contarPorSituacao(contas: readonly ContaDto[], filtro: FiltroContas): Record<FiltroSituacao, number> {
  const busca = normalizarNome(filtro.busca);
  const base = contas.filter(c => passaSemSituacao(c, filtro, busca));
  const ativas = base.filter(c => c.ativo).length;
  return { ativas, inativas: base.length - ativas, todas: base.length };
}

export interface ResumoContas {
  ativas: number;
  /** Soma das ativas de categoria Receita: o que se espera receber por mês. */
  receitasMes: number;
  /** Soma das outras ativas: o que se espera pagar por mês. */
  despesasMes: number;
  /** Receitas − despesas (card #22: antes o card somava as duas juntas). */
  saldoMes: number;
  /** Ativas parceladas com parcela atual dentro do total. */
  parceladasEmAndamento: number;
  inativas: number;
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** `ehReceita` diz pela categoria da conta se ela é receita (a conta não traz o tipo). */
export function resumoDasContas(contas: readonly ContaDto[], ehReceita: (categoriaId: number) => boolean): ResumoContas {
  const ativas = contas.filter(c => c.ativo);
  const soma = (lista: ContaDto[]) => lista.reduce((total, c) => total + c.valor, 0);
  const receitasMes = centavos(soma(ativas.filter(c => ehReceita(c.categoriaId))));
  const despesasMes = centavos(soma(ativas.filter(c => !ehReceita(c.categoriaId))));
  return {
    ativas: ativas.length,
    receitasMes,
    despesasMes,
    saldoMes: centavos(receitasMes - despesasMes),
    parceladasEmAndamento: ativas.filter(c => c.ehParcelado && c.parcelaAtual <= c.quantidadeParcelas).length,
    inativas: contas.length - ativas.length
  };
}

export interface PreviaParcelamento {
  faltam: number;
  de: number;
  ate: number;
  valorMes: number;
  lancamentosPorMes: number;
  valorLancamento: number;
  totalRestante: number;
  /** Mês da última parcela se pagar uma por mês a partir deste ("mai/2027"). */
  termino: string;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Prévia do parcelamento no formulário. A parcela atual é a próxima a lançar (0 = nenhuma paga, conta como a 1ª);
 * cada mês gera um lançamento por dia de vencimento, com o valor do mês dividido entre eles. Null se não dá para prever.
 */
export function previaParcelamento(
  entrada: { valor: number; dias: readonly number[]; parcelaAtual: number; total: number },
  hoje = new Date()
): PreviaParcelamento | null {
  const { valor, dias, total } = entrada;
  const de = Math.max(1, entrada.parcelaAtual);
  if (!dias.length || total < 1 || de > total) return null;

  const faltam = total - de + 1;
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + faltam - 1, 1);
  return {
    faltam, de, ate: total,
    valorMes: valor,
    lancamentosPorMes: dias.length,
    valorLancamento: Math.round((valor / dias.length) * 100) / 100,
    totalRestante: Math.round(valor * faltam * 100) / 100,
    termino: `${MESES[fim.getMonth()]}/${fim.getFullYear()}`
  };
}

export interface ResumoLancamentos {
  pagosNoPrazo: number;
  pagosAtrasados: number;
  pendentes: number;
  aguardando: number;
  /** Soma do que já foi pago (no prazo e com atraso). */
  totalPago: number;
}

/** Contadores da aba Lançamentos pela situação gravada em Contas a Pagar. */
export function resumoDosLancamentos(lancamentos: readonly LancamentoDaConta[]): ResumoLancamentos {
  const com = (situacao: string) => lancamentos.filter(l => l.situacao === situacao);
  const pagos = lancamentos.filter(l => l.situacao === 'PAGO NO PRAZO' || l.situacao === 'PAGO ATRASADO');
  return {
    pagosNoPrazo: com('PAGO NO PRAZO').length,
    pagosAtrasados: com('PAGO ATRASADO').length,
    pendentes: com('PENDENTE').length,
    aguardando: com('AGUARDANDO').length,
    totalPago: Math.round(pagos.reduce((soma, l) => soma + l.valor, 0) * 100) / 100
  };
}

/** Lançamentos agrupados por mês ("out/2026"), na ordem em que vieram (a API manda o mais recente primeiro). */
export function lancamentosPorMes(lancamentos: readonly LancamentoDaConta[]): { mes: string; itens: LancamentoDaConta[] }[] {
  const grupos: { mes: string; itens: LancamentoDaConta[] }[] = [];
  for (const lancamento of lancamentos) {
    const [ano, mes] = lancamento.data.split('-').map(Number);
    const rotulo = `${MESES[mes - 1]}/${ano}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === rotulo) ultimo.itens.push(lancamento);
    else grupos.push({ mes: rotulo, itens: [lancamento] });
  }
  return grupos;
}

export type SituacaoDoMes = 'no-prazo' | 'atraso' | 'aberto';

export interface PontosAcompanhamento {
  /** Rótulos curtos dos meses do período, do mais antigo ao mais recente ("dez/25"). */
  meses: string[];
  /** Soma dos lançamentos do mês; null quando o mês não teve lançamento (a linha fica com uma falha ali). */
  valores: (number | null)[];
  /** O que pesa no mês: em aberto > pago com atraso > pago no prazo. */
  situacoes: (SituacaoDoMes | null)[];
  /** Meses com mais de 10× a mediana dos outros: provável valor digitado errado. */
  foraDoPadrao: { mes: string; valor: number }[];
}

/** Acima disto (vezes a mediana dos outros meses) o mês é avisado como fora do padrão. */
const FATOR_FORA_DO_PADRAO = 10;

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/** Mês e ano (mes de 1 a 12). */
export interface MesAno { ano: number; mes: number; }
/** Período do painel de lançamentos, de e até inclusos (card #22). */
export interface Periodo { de: MesAno; ate: MesAno; }

/** Mês como número contínuo, para comparar e contar meses. */
const indiceDoMes = ({ ano, mes }: MesAno) => ano * 12 + (mes - 1);
const mesDoIndice = (i: number): MesAno => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });
const mesDoLancamento = (l: LancamentoDaConta): MesAno => {
  const [ano, mes] = l.data.split('-').map(Number);
  return { ano, mes };
};

/** Como o painel abre: 12 meses terminando no mês mais recente com lançamento ou no mês atual, o que vier depois. */
export function periodoPadrao(lancamentos: readonly LancamentoDaConta[], hoje = new Date()): Periodo {
  const fim = Math.max(indiceDoMes({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }),
    ...lancamentos.map(l => indiceDoMes(mesDoLancamento(l))));
  return { de: mesDoIndice(fim - 11), ate: mesDoIndice(fim) };
}

export function lancamentosNoPeriodo(lancamentos: readonly LancamentoDaConta[], periodo: Periodo): LancamentoDaConta[] {
  const de = indiceDoMes(periodo.de);
  const ate = indiceDoMes(periodo.ate);
  return lancamentos.filter(l => {
    const i = indiceDoMes(mesDoLancamento(l));
    return i >= de && i <= ate;
  });
}

/**
 * Card Acompanhamento do painel de lançamentos: uma linha com o valor de cada mês do período e a situação que
 * colore o ponto. O que está fora do período fica de fora.
 */
export function pontosDoAcompanhamento(lancamentos: readonly LancamentoDaConta[], periodo: Periodo): PontosAcompanhamento {
  const inicio = indiceDoMes(periodo.de);
  const fim = indiceDoMes(periodo.ate);
  const peso: Record<SituacaoDoMes, number> = { 'no-prazo': 1, atraso: 2, aberto: 3 };

  const p: PontosAcompanhamento = { meses: [], valores: [], situacoes: [], foraDoPadrao: [] };
  for (let i = inicio; i <= fim; i++) {
    p.meses.push(`${MESES[i % 12]}/${String(Math.floor(i / 12)).slice(-2)}`);
    p.valores.push(null);
    p.situacoes.push(null);
  }
  for (const l of lancamentos) {
    const posicao = indiceDoMes(mesDoLancamento(l)) - inicio;
    if (posicao < 0 || posicao > fim - inicio) continue;
    p.valores[posicao] = Math.round(((p.valores[posicao] ?? 0) + l.valor) * 100) / 100;
    const situacao: SituacaoDoMes = l.situacao === 'PAGO NO PRAZO' ? 'no-prazo' : l.situacao === 'PAGO ATRASADO' ? 'atraso' : 'aberto';
    const atual = p.situacoes[posicao];
    if (!atual || peso[situacao] > peso[atual]) p.situacoes[posicao] = situacao;
  }

  p.valores.forEach((valor, i) => {
    const outros = p.valores.filter((v, j): v is number => j !== i && v !== null && v > 0);
    if (valor !== null && outros.length && valor > FATOR_FORA_DO_PADRAO * mediana(outros)) {
      p.foraDoPadrao.push({ mes: p.meses[i], valor });
    }
  });
  return p;
}

/** Conta nova a partir de outra (Duplicar): mesmo conteúdo, "(cópia)" no nome e parcelas recomeçando da 1ª. */
export function duplicarConta(conta: ContaDto): ContaDto {
  return {
    ...conta,
    id: 0,
    nome: `${conta.nome} (cópia)`,
    parcelaAtual: conta.ehParcelado ? 1 : conta.parcelaAtual,
    vencimentos: (conta.vencimentos ?? []).map(v => ({ ...v, id: 0, contaId: 0 }))
  };
}
