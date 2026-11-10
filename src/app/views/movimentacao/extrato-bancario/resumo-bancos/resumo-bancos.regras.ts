import { ResumoContaDto } from 'src/app/core/models/resumo-categorias.model';

/** Regras da listagem de contas (cards #62 e #77), sem Angular. Os números vêm prontos da API (/GetResumoContas). */

export type FiltroBancos = 'todas' | 'contas' | 'cartoes';
export type OrdemBancos = 'nome' | 'valor' | 'lancamentos' | 'sem-categoria';

export function filtrarBancos(contas: readonly ResumoContaDto[], filtro: FiltroBancos, busca = ''): ResumoContaDto[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  return contas.filter(c => (filtro === 'todas' || c.ehCredito === (filtro === 'cartoes')) && c.nome.toLocaleLowerCase('pt-BR').includes(termo));
}

/** Valor que a conta movimentou: fatura no cartão, saídas na conta. */
const valorDaConta = (c: ResumoContaDto): number => (c.ehCredito ? c.fatura : c.saidas);

export function ordenarBancos(contas: readonly ResumoContaDto[], ordem: OrdemBancos): ResumoContaDto[] {
  const porNome = (a: ResumoContaDto, b: ResumoContaDto) => a.nome.localeCompare(b.nome, 'pt-BR');
  const criterio: Record<OrdemBancos, (a: ResumoContaDto, b: ResumoContaDto) => number> = {
    nome: porNome,
    valor: (a, b) => valorDaConta(b) - valorDaConta(a) || porNome(a, b),
    lancamentos: (a, b) => b.quantidade - a.quantidade || porNome(a, b),
    'sem-categoria': (a, b) => b.semCategoria - a.semCategoria || porNome(a, b)
  };
  return [...contas].sort(criterio[ordem]);
}

/** Sem lançamento no mês e nada a importar: fica recolhida em "N contas sem lançamentos". */
export function semMovimento(c: ResumoContaDto): boolean {
  return c.quantidade === 0 && !c.faltaImportar;
}

export interface NumeroDoCard {
  rotulo: string;
  valor: number;
  tipo: 'moeda' | 'contagem';
  tom?: 'entrada' | 'saida' | 'alerta';
}

/** Os 3 números do card, iguais aos 3 primeiros KPIs do topo do detalhe. */
export function numerosDoCard(c: ResumoContaDto): NumeroDoCard[] {
  if (!c.ehCredito) {
    return [
      { rotulo: 'Entradas', valor: c.entradas, tipo: 'moeda', tom: 'entrada' },
      { rotulo: 'Saídas', valor: c.saidas, tipo: 'moeda' },
      { rotulo: 'Resultado', valor: c.resultado, tipo: 'moeda', tom: c.resultado < 0 ? 'saida' : 'entrada' }
    ];
  }
  if (c.compartilhado) {
    return [
      { rotulo: 'Fatura', valor: c.fatura, tipo: 'moeda' },
      { rotulo: 'Minhas compras', valor: c.minhasCompras, tipo: 'moeda' },
      { rotulo: 'De outras pessoas', valor: c.deOutrasPessoas, tipo: 'moeda' }
    ];
  }
  return [
    { rotulo: 'Fatura', valor: c.fatura, tipo: 'moeda' },
    { rotulo: 'Pagamentos', valor: c.pagamentosEstornos, tipo: 'moeda', tom: 'entrada' },
    { rotulo: 'Parcelas futuras', valor: c.parcelasQueContinuam, tipo: 'moeda' }
  ];
}

/** "Carlos", "Carlos e Ágatha", "Carlos, Ágatha e Bia". */
export function juntarNomes(nomes: readonly string[]): string {
  return nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

// ---------- Filtros por campo (card #72, como Contas a Pagar) ----------

export type SituacaoConta = 'importado' | 'falta' | 'manual' | 'sem-lancamentos';
export type Compartilhamento = 'todos' | 'compartilhados' | 'so-meus';

export const OPCOES_SITUACAO: { label: string; value: SituacaoConta }[] = [
  { label: 'Importado', value: 'importado' },
  { label: 'Falta importar', value: 'falta' },
  { label: 'Lançamento manual', value: 'manual' },
  { label: 'Sem lançamentos', value: 'sem-lancamentos' }
];

export const OPCOES_COMPARTILHAMENTO: { label: string; value: Compartilhamento }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Compartilhados', value: 'compartilhados' },
  { label: 'Só meus', value: 'so-meus' }
];

export interface FiltrosContas {
  situacoes: SituacaoConta[];
  /** Vale para cartões: conta corrente não entra em "Compartilhados" nem em "Só meus". */
  compartilhamento: Compartilhamento;
  soSemCategoria: boolean;
  valorMin: number | null;
  valorMax: number | null;
}

export const filtrosContasVazios = (): FiltrosContas =>
  ({ situacoes: [], compartilhamento: 'todos', soSemCategoria: false, valorMin: null, valorMax: null });

export function situacaoDa(c: ResumoContaDto): SituacaoConta {
  if (c.faltaImportar) return 'falta';
  if (c.importadoEm) return 'importado';
  return c.quantidade ? 'manual' : 'sem-lancamentos';
}

export function filtrarPorCampos(contas: readonly ResumoContaDto[], f: FiltrosContas): ResumoContaDto[] {
  return contas.filter(c => {
    if (f.situacoes.length && !f.situacoes.includes(situacaoDa(c))) return false;
    if (f.compartilhamento === 'compartilhados' && !(c.ehCredito && c.compartilhado)) return false;
    if (f.compartilhamento === 'so-meus' && !(c.ehCredito && !c.compartilhado)) return false;
    if (f.soSemCategoria && !c.semCategoria) return false;
    const valor = valorDaConta(c);
    if (f.valorMin != null && valor < f.valorMin) return false;
    return f.valorMax == null || valor <= f.valorMax;
  });
}

/** Quantos filtros estão ligados (o número no botão de filtros). */
export function quantosFiltros(f: FiltrosContas): number {
  return (f.situacoes.length ? 1 : 0) + (f.compartilhamento !== 'todos' ? 1 : 0) + (f.soSemCategoria ? 1 : 0)
    + (f.valorMin != null || f.valorMax != null ? 1 : 0);
}
