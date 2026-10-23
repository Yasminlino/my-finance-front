import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateBR, formatDateInput, parseCurrencyBR } from 'src/app/core/utils/mask';
import { STATUS_PAGAMENTO_OPTIONS, contaPaga } from 'src/app/shared/enums/status.enum';
import { vencimentoDe } from './contas-a-pagar.regras';

/** Campos que o modo edição de Contas a Pagar deixa alterar. O total de parcelas vem da conta. */
export type CampoEditavel = 'valor' | 'data' | 'situacao' | 'parcelaAtual' | 'observacao';

const CAMPOS_EDITAVEIS: CampoEditavel[] = ['valor', 'data', 'situacao', 'parcelaAtual', 'observacao'];

/**
 * Valores ligados aos campos, no tipo que cada componente PrimeNG espera. Referência estável por
 * linha: o ngModel não reescreve o campo a cada detecção de mudanças.
 */
export interface RascunhoConta {
  valor: number | null;
  data: Date | null;
  situacao: string;
  parcelaAtual: number | null;
  observacao: string;
}

export type ErrosDaLinha = Partial<Record<CampoEditavel, string>>;

type Alteracoes = Partial<Record<CampoEditavel, unknown>>;

/**
 * Estado do modo edição: guarda os originais ao ligar e as alterações por id, então elas
 * sobrevivem à troca de página e de filtro até salvar ou descartar. Conta paga fica bloqueada
 * até ser desbloqueada. Sem Angular: a tabela lê daqui e escreve aqui.
 */
export class EdicaoContas {
  private readonly originais = new Map<number, LinhaContasMensais>();
  private readonly alteracoes = new Map<number, Alteracoes>();
  private readonly desbloqueadas = new Set<number>();

  constructor(contas: LinhaContasMensais[]) {
    contas.forEach(conta => this.originais.set(conta.id, { ...conta }));
  }

  original(id: number, campo: CampoEditavel): LinhaContasMensais[CampoEditavel] | undefined {
    return this.originais.get(id)?.[campo];
  }

  valor(id: number, campo: CampoEditavel): unknown {
    const alteracoes = this.alteracoes.get(id);
    return alteracoes && campo in alteracoes ? alteracoes[campo] : this.original(id, campo);
  }

  /** Igual ao original remove a alteração; conta bloqueada ignora. */
  alterar(id: number, campo: CampoEditavel, valor: unknown): void {
    if (!this.originais.has(id) || this.bloqueada(id)) return;

    const alteracoes: Alteracoes = { ...this.alteracoes.get(id) };
    if (mesmoValor(campo, valor, this.original(id, campo))) {
      delete alteracoes[campo];
    } else {
      alteracoes[campo] = valor;
    }

    if (Object.keys(alteracoes).length) {
      this.alteracoes.set(id, alteracoes);
    } else {
      this.alteracoes.delete(id);
    }
  }

  foiAlterado(id: number, campo?: CampoEditavel): boolean {
    const alteracoes = this.alteracoes.get(id);
    if (!alteracoes) return false;
    return campo ? campo in alteracoes : true;
  }

  desfazerCampo(id: number, campo: CampoEditavel): void {
    this.alterar(id, campo, this.original(id, campo));
  }

  desfazerLinha(id: number): void {
    this.alteracoes.delete(id);
  }

  descartar(): void {
    this.alteracoes.clear();
    this.desbloqueadas.clear();
  }

  get idsAlterados(): Set<number> {
    return new Set(this.alteracoes.keys());
  }

  /** Linhas alteradas (o "Salvar alterações (N)"). */
  get contagem(): number {
    return this.alteracoes.size;
  }

  /** Só linhas alteradas são validadas: dado antigo fora da regra não trava o salvar. */
  erros(id: number): ErrosDaLinha {
    if (!this.foiAlterado(id)) return {};

    const conta = this.linhaAtual(id);
    const erros: ErrosDaLinha = {};

    const valor = parseCurrencyBR(conta.valor);
    if (valor === null || valor <= 0) erros.valor = 'Informe um valor maior que zero.';

    if (!formatDateInput(conta.data)) erros.data = 'Informe uma data válida.';

    if (conta.ehParcelado) {
      const parcela = Number(conta.parcelaAtual);
      const total = conta.quantidadeParcelas;
      if (!Number.isInteger(parcela) || parcela < 1) {
        erros.parcelaAtual = 'A parcela começa em 1.';
      } else if (total && parcela > total) {
        erros.parcelaAtual = `Parcela maior que o total (${total}).`;
      }
    }

    return erros;
  }

  get temErros(): boolean {
    return [...this.alteracoes.keys()].some(id => Object.keys(this.erros(id)).length > 0);
  }

  get podeSalvar(): boolean {
    return this.contagem > 0 && !this.temErros;
  }

  /** Conta paga (pela situação de quando a edição começou) não é editada sem desbloquear. */
  bloqueada(id: number): boolean {
    const original = this.originais.get(id);
    return !!original && contaPaga(original) && !this.desbloqueadas.has(id);
  }

  desbloquear(id: number): void {
    this.desbloqueadas.add(id);
  }

  /** Original com as alterações aplicadas: o que vai para a API e para a prévia. */
  linhaAtual(id: number): LinhaContasMensais {
    return { ...this.originais.get(id)!, ...this.alteracoes.get(id) } as LinhaContasMensais;
  }

  alteradas(): LinhaContasMensais[] {
    return [...this.alteracoes.keys()].map(id => this.linhaAtual(id));
  }

  /** Quantos campos da linha mudaram (o "2 alterações" do bottom sheet). */
  camposAlterados(id: number): number {
    return CAMPOS_EDITAVEIS.filter(campo => this.foiAlterado(id, campo)).length;
  }

  rascunho(id: number): RascunhoConta {
    const data = this.valor(id, 'data');
    return {
      valor: parseCurrencyBR(this.valor(id, 'valor')),
      data: data ? vencimentoDe({ data }) : null,
      situacao: String(this.valor(id, 'situacao') ?? ''),
      parcelaAtual: numeroOuNulo(this.valor(id, 'parcelaAtual')),
      observacao: String(this.valor(id, 'observacao') ?? '')
    };
  }

  /** Valor de antes da edição, como a tela mostra, para o riscado sob o campo. */
  anterior(id: number, campo: CampoEditavel): string {
    const conta = this.originais.get(id);
    switch (campo) {
      case 'valor': return formatCurrencyBR(conta?.valor);
      case 'data': return formatDateBR(conta?.data);
      case 'situacao': return STATUS_PAGAMENTO_OPTIONS.find(o => o.value === conta?.situacao)?.label ?? conta?.situacao ?? '';
      case 'observacao': return conta?.observacao || '(vazia)';
      case 'parcelaAtual': return conta?.parcelaAtual == null ? '—' : String(conta.parcelaAtual);
    }
  }
}

function numeroOuNulo(valor: unknown): number | null {
  return valor == null || valor === '' ? null : Number(valor);
}

function mesmoValor(campo: CampoEditavel, a: unknown, b: unknown): boolean {
  switch (campo) {
    case 'valor':
      return parseCurrencyBR(a) === parseCurrencyBR(b);
    case 'data':
      return formatDateInput(a) === formatDateInput(b);
    case 'parcelaAtual':
      if (a == null || b == null) return (a ?? null) === (b ?? null);
      return Number(a) === Number(b);
    case 'observacao':
      return (a ?? '') === (b ?? '');
    default:
      return a === b;
  }
}
