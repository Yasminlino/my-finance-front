import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { parseCurrencyBR, toDate } from 'src/app/core/utils/mask';
import { STATUS_PAGAMENTO_OPTIONS, TagStatus, contaPaga } from 'src/app/shared/enums/status.enum';
import { NaturezaLancamento, naturezaPorSubCategoria } from 'src/app/shared/utils/totais-selecao';

/**
 * Regras de exibição de Contas a Pagar, sem estado e sem Angular: o que a tela mostra de cada conta
 * (situação, vencimento relativo, tag de status) e o resumo do mês. "Hoje" vem de fora para os testes.
 */

/** Situação derivada do status salvo e do vencimento; "atrasada" não existe na API. */
export type Situacao = 'a-vencer' | 'atrasada' | 'paga';

/** Opções do filtro da tabela. "alteradas" só aparece no modo edição. */
export type FiltroSituacao = 'todas' | 'a-vencer' | 'vencidas' | 'pagas' | 'alteradas';

export type StatusPago = 'PAGO NO PRAZO' | 'PAGO ATRASADO';

export interface VencimentoRelativo {
  texto: string;
  tom: 'vermelho' | 'laranja' | 'cinza' | 'neutro';
}

export interface TagDoStatus {
  label: string;
  severity: TagStatus;
}

export interface ResumoMes {
  receitas: number;
  receitasQtd: number;
  despesas: number;
  despesasQtd: number;
  /** Despesas já pagas. */
  pago: number;
  /** pago / despesas, de 0 a 100. */
  percentualPago: number;
  /** Atrasadas que não são receita (despesas e categorias sem subcategoria). */
  vencidasValor: number;
  vencidasQtd: number;
  /** Receitas atrasadas: mostradas à parte, não somam nas vencidas. */
  naoRecebidasValor: number;
  naoRecebidasQtd: number;
}

/** O que as regras de exibição leem de uma conta. */
type ContaExibida = { situacao: string; data: unknown; subcategoriaNome?: string | null };

/** Até quantos dias antes o vencimento fica em destaque (laranja). */
const DIAS_EM_DESTAQUE = 7;
const UM_DIA_MS = 86_400_000;

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Vencimento à meia-noite local. "YYYY-MM-DD" (DateOnly da API) é lido pelo toDate. */
export function vencimentoDe(conta: { data: unknown }): Date {
  const valor = conta.data;
  const data = typeof valor === 'string' ? toDate(valor) : new Date(valor as Date);
  return inicioDoDia(data);
}

/** Dias do início de hoje até o vencimento; negativo quando já venceu. */
function diasAteVencer(conta: { data: unknown }, hoje: Date): number {
  return Math.round((vencimentoDe(conta).getTime() - inicioDoDia(hoje).getTime()) / UM_DIA_MS);
}

export function situacao(conta: { situacao: string; data: unknown }, hoje: Date): Situacao {
  if (contaPaga(conta)) return 'paga';
  return diasAteVencer(conta, hoje) < 0 ? 'atrasada' : 'a-vencer';
}

function dias(n: number): string {
  return n === 1 ? '1 dia' : `${n} dias`;
}

/** Receita fala em recebimento ("Não recebido", "Recebida"); o resto, em vencimento e pagamento. */
export function vencimentoRelativo(conta: ContaExibida, hoje: Date): VencimentoRelativo {
  const receita = ehReceita(conta);
  if (contaPaga(conta)) return { texto: receita ? 'Recebida' : 'Paga', tom: 'cinza' };

  const n = diasAteVencer(conta, hoje);
  if (n < 0) return { texto: `${receita ? 'Não recebido' : 'Vencida'} há ${dias(-n)}`, tom: 'vermelho' };
  if (n === 0) return { texto: 'Vence hoje', tom: 'laranja' };
  if (n <= DIAS_EM_DESTAQUE) return { texto: `Vence em ${dias(n)}`, tom: 'laranja' };
  return { texto: '', tom: 'neutro' };
}

/** Status gravado ao marcar como pago: no prazo até o próprio dia do vencimento. */
export function statusAoPagar(vencimento: Date, hoje: Date): StatusPago {
  return inicioDoDia(vencimento) >= inicioDoDia(hoje) ? 'PAGO NO PRAZO' : 'PAGO ATRASADO';
}

/** Tag da coluna Status: em aberto e vencida aparece como ATRASADA (NÃO RECEBIDO, se for receita). */
export function tagDoStatus(conta: ContaExibida, hoje: Date): TagDoStatus {
  if (situacao(conta, hoje) === 'atrasada') {
    return { label: ehReceita(conta) ? 'NÃO RECEBIDO' : 'ATRASADA', severity: TagStatus.Danger };
  }

  const opcao = STATUS_PAGAMENTO_OPTIONS.find(o => o.value === conta.situacao);
  return { label: opcao?.label ?? conta.situacao, severity: opcao?.classe ?? TagStatus.Secondary };
}

/** Modo edição: o que a alteração muda na situação da conta ("" quando nada muda). */
export function previaDoEfeito(
  antes: { situacao: string; data: unknown },
  depois: { situacao: string; data: unknown },
  hoje: Date
): string {
  const de = situacao(antes, hoje);
  const para = situacao(depois, hoje);
  if (de === para) return '';
  if (para === 'paga') return 'Passa a contar como paga';
  if (de === 'paga') return 'Volta a ficar em aberto';
  return para === 'atrasada' ? 'Passa a ficar atrasada' : 'Deixa de ficar atrasada';
}

export function ehReceita(conta: { subcategoriaNome?: string | null }): boolean {
  return naturezaPorSubCategoria(conta.subcategoriaNome) === NaturezaLancamento.Receita;
}

/** Cards do topo: calculados sobre o mês inteiro, não sobre a seleção nem a página. */
export function resumoDoMes(contas: LinhaContasMensais[], hoje: Date): ResumoMes {
  const resumo: ResumoMes = {
    receitas: 0, receitasQtd: 0, despesas: 0, despesasQtd: 0, pago: 0, percentualPago: 0,
    vencidasValor: 0, vencidasQtd: 0, naoRecebidasValor: 0, naoRecebidasQtd: 0
  };

  for (const conta of contas) {
    const valor = parseCurrencyBR(conta.valor) ?? 0;
    const natureza = naturezaPorSubCategoria(conta.subcategoriaNome);
    const sit = situacao(conta, hoje);

    if (natureza === NaturezaLancamento.Receita) {
      resumo.receitas += valor;
      resumo.receitasQtd++;
    }
    if (natureza === NaturezaLancamento.Despesa) {
      resumo.despesas += valor;
      resumo.despesasQtd++;
      if (sit === 'paga') resumo.pago += valor;
    }
    if (sit === 'atrasada' && natureza === NaturezaLancamento.Receita) {
      resumo.naoRecebidasValor += valor;
      resumo.naoRecebidasQtd++;
    } else if (sit === 'atrasada') {
      resumo.vencidasValor += valor;
      resumo.vencidasQtd++;
    }
  }

  resumo.percentualPago = resumo.despesas > 0 ? resumo.pago / resumo.despesas * 100 : 0;
  return resumo;
}

/** Contadores do filtro de situação, sobre o mês inteiro. */
export function contarPorSituacao(
  contas: LinhaContasMensais[],
  hoje: Date
): Record<Exclude<FiltroSituacao, 'alteradas'>, number> {
  const contagem = { todas: contas.length, 'a-vencer': 0, vencidas: 0, pagas: 0 };
  for (const conta of contas) {
    const sit = situacao(conta, hoje);
    if (sit === 'a-vencer') contagem['a-vencer']++;
    if (sit === 'atrasada') contagem.vencidas++;
    if (sit === 'paga') contagem.pagas++;
  }
  return contagem;
}

/** Palavra-chave (sem acento, minúscula) -> ícone. A primeira que aparecer no nome vence. */
const ICONES_POR_PALAVRA: Array<[string, string]> = [
  ['morad', 'pi pi-home'],
  ['aluguel', 'pi pi-home'],
  ['casa', 'pi pi-home'],
  ['condominio', 'pi pi-building'],
  ['energia', 'pi pi-bolt'],
  ['luz', 'pi pi-bolt'],
  ['internet', 'pi pi-wifi'],
  ['telefon', 'pi pi-phone'],
  ['celular', 'pi pi-mobile'],
  ['cartao', 'pi pi-credit-card'],
  ['credito', 'pi pi-credit-card'],
  ['transporte', 'pi pi-car'],
  ['carro', 'pi pi-car'],
  ['veiculo', 'pi pi-car'],
  ['combust', 'pi pi-car'],
  ['mercado', 'pi pi-shopping-cart'],
  ['aliment', 'pi pi-shopping-cart'],
  ['compra', 'pi pi-shopping-cart'],
  ['saude', 'pi pi-heart'],
  ['educa', 'pi pi-graduation-cap'],
  ['escola', 'pi pi-graduation-cap'],
  ['curso', 'pi pi-book'],
  ['salario', 'pi pi-briefcase'],
  ['trabalho', 'pi pi-briefcase'],
  ['presente', 'pi pi-gift'],
  ['imposto', 'pi pi-receipt'],
  ['juros', 'pi pi-percentage'],
  ['investimento', 'pi pi-chart-line'],
  ['logistic', 'pi pi-truck'],
  ['frete', 'pi pi-truck'],
  ['debito', 'pi pi-sync'],
  ['assinatura', 'pi pi-sync'],
  ['lazer', 'pi pi-ticket'],
  ['viage', 'pi pi-globe'],
  ['pet', 'pi pi-heart'],
  ['manutencao', 'pi pi-wrench'],
  ['seguro', 'pi pi-shield'],
  ['conta', 'pi pi-receipt'],
  ['receita', 'pi pi-money-bill'],
];

const ICONE_PADRAO = 'pi pi-wallet';

function chaveDaCategoria(nome: string | null | undefined): string {
  return (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function iconeDaCategoria(nome: string | null | undefined): string {
  const chave = chaveDaCategoria(nome);
  if (!chave) return ICONE_PADRAO;
  return ICONES_POR_PALAVRA.find(([palavra]) => chave.includes(palavra))?.[1] ?? ICONE_PADRAO;
}

/** Quantidade de cores da paleta de categorias (classes cor-0 … cor-7 na tabela). */
const CORES_DE_CATEGORIA = 8;

/**
 * Cor do ícone da categoria, estável pelo nome: a mesma categoria tem sempre a mesma cor, sem
 * precisar cadastrar cor na API. Hash simples do nome normalizado sobre a paleta.
 */
export function corDaCategoria(nome: string | null | undefined): string {
  const chave = chaveDaCategoria(nome);
  if (!chave) return 'cor-neutra';
  let hash = 0;
  for (const letra of chave) hash = (hash * 31 + letra.charCodeAt(0)) >>> 0;
  return `cor-${hash % CORES_DE_CATEGORIA}`;
}
