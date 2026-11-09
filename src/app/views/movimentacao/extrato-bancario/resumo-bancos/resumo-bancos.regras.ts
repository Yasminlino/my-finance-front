import { BancoDto } from 'src/app/core/models/banco.model';
import { CoberturaImportacoesDto, ExtratoItemDto, ImportacaoDto } from 'src/app/core/models/extrato.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { ContaDoMes, contasDoMes, faturaPorPessoa, semCategoria, vencimentoNoMes } from '../extrato.regras';

export type FiltroBancos = 'todas' | 'contas' | 'cartoes';

/** Um banco na lista do Resumo (card #62). */
export interface CardBanco extends ContaDoMes {
  /** "Ag. 1234 · CC 5678-9" na conta; "Fatura out · vence 10/11 (em 14 dias)" no cartão. */
  subtitulo: string;
  /** Total da fatura, igual ao do Extrato; 0 em conta corrente. */
  fatura: number;
  minhas: number;
  outras: number;
  /** Das compras desta fatura, o que ainda falta receber nos Acertos; null se os Acertos não carregaram. */
  faltaReceber: number | null;
  /** "10/11"; vazio sem dia de vencimento cadastrado ou em conta corrente. */
  vence: string;
  semCategoria: number;
  /** Data da importação mais recente que trouxe lançamentos deste mês. */
  importadoEm: string | null;
  /** Falta importar, pela mesma regra da Cobertura (card #75). */
  falta: boolean;
  /** Última importação do banco em qualquer mês, para o card de "falta". */
  ultimaImportacao: string | null;
}

export interface DadosResumoBancos {
  mes: string;
  itens: readonly ExtratoItemDto[];
  bancos: readonly BancoDto[];
  tipos: readonly TipoCartaoDto[];
  pessoas: readonly PessoaMovimentacaoDto[];
  importacoes: readonly ImportacaoDto[];
  cobertura: CoberturaImportacoesDto | null;
  /** Compras dos Acertos por id do lançamento; null se não carregaram. */
  compras: ReadonlyMap<number, { valor: number; pago: number }> | null;
  hoje?: Date;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function subtituloCartao(mes: string, vence: string, hoje: Date): string {
  const [ano, numero] = mes.split('-').map(Number);
  const inicio = `Fatura ${MESES[numero - 1]}`;
  if (!vence) return inicio;
  const dia = Number(vence.split('/')[0]);
  const dias = Math.round((new Date(ano, numero - 1, dia).getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86400000);
  return `${inicio} · vence ${vence}${dias > 0 ? ` (em ${dias} ${dias === 1 ? 'dia' : 'dias'})` : ''}`;
}

function subtituloConta(banco: BancoDto | undefined): string {
  return [banco?.agencia && `Ag. ${banco.agencia}`, banco?.numeroConta && `CC ${banco.numeroConta}`].filter(Boolean).join(' · ');
}

function faltaDasCompras(itens: readonly ExtratoItemDto[], compras: DadosResumoBancos['compras']): number | null {
  if (!compras) return null;
  const falta = itens.reduce((soma, i) => {
    const c = compras.get(i.id);
    return c ? soma + Math.max(0, c.valor - c.pago) : soma;
  }, 0);
  return Math.round(falta * 100) / 100;
}

const maisRecente = (lista: readonly ImportacaoDto[]): string | null =>
  lista.reduce<string | null>((ultima, i) => (!ultima || i.importadoEm > ultima ? i.importadoEm : ultima), null);

export function montarCardsBancos(d: DadosResumoBancos): CardBanco[] {
  const validas = d.importacoes.filter(i => i.status !== 'Desfeita');
  return contasDoMes(d.itens, d.bancos, d.tipos).map(conta => {
    const daConta = d.itens.filter(i => i.bancoId === conta.bancoId);
    const idsDoMes = new Set(daConta.map(i => i.extratoBancarioId).filter(id => id != null));
    const celula = d.cobertura?.contas.find(c => c.bancoId === conta.bancoId)?.celulas.find(c => c.mes === d.mes);
    const banco = d.bancos.find(b => b.id === conta.bancoId);
    const vence = conta.ehCredito ? vencimentoNoMes(banco?.diaVencimento, d.mes) : '';
    const fatura = conta.ehCredito ? faturaPorPessoa(daConta, [...d.pessoas]) : null;
    return {
      ...conta,
      subtitulo: conta.ehCredito ? subtituloCartao(d.mes, vence, d.hoje ?? new Date()) : subtituloConta(banco),
      fatura: fatura?.total ?? 0,
      minhas: fatura?.minhas ?? 0,
      outras: fatura?.outras ?? 0,
      faltaReceber: faltaDasCompras(daConta, d.compras),
      vence,
      semCategoria: daConta.filter(semCategoria).length,
      importadoEm: maisRecente(validas.filter(i => idsDoMes.has(i.id))),
      falta: celula?.estado === 'falta',
      ultimaImportacao: maisRecente(validas.filter(i => i.bancoId === conta.bancoId))
    };
  });
}

export function filtrarBancos(cards: readonly CardBanco[], filtro: FiltroBancos, busca = ''): CardBanco[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  return cards.filter(c => (filtro === 'todas' || c.ehCredito === (filtro === 'cartoes')) && c.nome.toLocaleLowerCase('pt-BR').includes(termo));
}

export type OrdemBancos = 'nome' | 'valor' | 'lancamentos' | 'sem-categoria';

/** Valor que o banco movimentou: fatura no cartão, saídas na conta. */
const valorDoBanco = (c: CardBanco): number => (c.ehCredito ? c.fatura : c.saidas);

export function ordenarBancos(cards: readonly CardBanco[], ordem: OrdemBancos): CardBanco[] {
  const porNome = (a: CardBanco, b: CardBanco) => a.nome.localeCompare(b.nome, 'pt-BR');
  const criterio: Record<OrdemBancos, (a: CardBanco, b: CardBanco) => number> = {
    nome: porNome,
    valor: (a, b) => valorDoBanco(b) - valorDoBanco(a) || porNome(a, b),
    lancamentos: (a, b) => b.quantidade - a.quantidade || porNome(a, b),
    'sem-categoria': (a, b) => b.semCategoria - a.semCategoria || porNome(a, b)
  };
  return [...cards].sort(criterio[ordem]);
}

/** Uma conta sem extrato conta 1; lançamentos sem categoria contam um a um. */
export function contarPendencias(cards: readonly CardBanco[]): { total: number; semExtrato: number; semCategoria: number } {
  const semExtrato = cards.filter(c => c.falta).length;
  const semCategoria = cards.reduce((soma, c) => soma + c.semCategoria, 0);
  return { total: semExtrato + semCategoria, semExtrato, semCategoria };
}
