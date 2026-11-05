import { AcertoCompraDto, AcertoParcelaFuturaDto, AcertoPessoaDto, AcertosDto } from 'src/app/core/models/acertos.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';

/** Regras da aba Acertos com pessoas (card #45, parte 3). Puras, para testar sem tela. */

export type OpcoesAcertos = { mostrarQuitados: boolean; mostrarEu: boolean };

/** Cards da tela: quitados e o "Eu" só com os switches; o "Eu" vem por último. */
export function pessoasVisiveis(acertos: AcertosDto | null, opcoes: OpcoesAcertos): AcertoPessoaDto[] {
  if (!acertos) return [];
  const pessoas = acertos.pessoas.filter(p => opcoes.mostrarQuitados || !p.quitado);
  return opcoes.mostrarEu && acertos.eu ? [...pessoas, acertos.eu] : pessoas;
}

/** Quanto do devido já voltou, de 0 a 100 (sem dívida conta como tudo recebido). */
export function percentualRecebido(p: Pick<AcertoPessoaDto, 'devido' | 'recebido'>): number {
  if (p.devido <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((p.recebido / p.devido) * 100)));
}

export function restanteDaCompra(c: AcertoCompraDto): number {
  return Math.max(0, round2(c.valor - c.pago));
}

/** Compras que ainda têm algo a pagar (as opções do "Abater de"). */
export function comprasEmAberto(p: AcertoPessoaDto): AcertoCompraDto[] {
  return p.compras.filter(c => !c.quitada && restanteDaCompra(c) > 0);
}

/** O "Tudo" do Registrar pagamento: o restante da compra escolhida, ou o que falta no geral. */
export function valorDoPagamento(p: AcertoPessoaDto, compraId: number | null): number {
  const compra = compraId == null ? null : p.compras.find(c => c.id === compraId);
  return compra ? restanteDaCompra(compra) : Math.max(0, round2(p.falta));
}

export type DadosPagamento = { valor: number; data: Date; bancoId: number; abateItemId: number | null };

/** O pagamento vira uma Entrada da pessoa na conta onde o dinheiro entrou (o criar lançamento de sempre). */
export function pagamentoParaDto(p: AcertoPessoaDto, dados: DadosPagamento): ExtratoItemDto {
  return {
    dataMovimentacao: diaDe(dados.data),
    valor: round2(dados.valor),
    tipoLancamento: 'Entrada',
    bancoId: dados.bancoId,
    descricao: `Pagamento de ${p.nome}`,
    pessoaMovimentacaoId: p.pessoaId,
    nomePessoaTransacao: p.nome,
    abateItemId: dados.abateItemId,
    alteraVinculoPessoa: false
  } as ExtratoItemDto;
}

export type MesDeParcelas = { mes: string; titulo: string; total: number; parcelas: AcertoParcelaFuturaDto[] };

/** Detalhe da pessoa: as próximas parcelas mês a mês. */
export function proximasPorMes(p: AcertoPessoaDto): MesDeParcelas[] {
  const meses = new Map<string, AcertoParcelaFuturaDto[]>();
  for (const parcela of p.proximasParcelas) meses.set(parcela.mes, [...(meses.get(parcela.mes) ?? []), parcela]);
  return [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, parcelas]) => ({ mes, titulo: tituloDoMes(mes), total: round2(parcelas.reduce((s, x) => s + x.valor, 0)), parcelas }));
}

/** Avatar: primeira letra das duas primeiras palavras ("Eu" fica "EU"). */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 1 && palavras[0].length <= 2) return palavras[0].toUpperCase();
  return palavras.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function tituloDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function diaDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
