import { Component, ViewChild, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { Table } from 'primeng/table';
import { ContaService } from 'src/app/core/services/contas.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ContaDto } from 'src/app/core/models/conta.model';
import { AparenciaCategoria, aparenciaDe, iconeDe } from 'src/app/shared/ui/aparencia';
import { nomesParecidos } from 'src/app/shared/utils/nomes-parecidos';
import { ehReceita } from '../../categoria/categorias.regras';
import {
  FiltroContas, FiltroSituacao, OrdemContas, ResumoContas, contarPorSituacao, diasDaConta, duplicarConta, filtrarContas,
  resumoDasContas, textoVencimento
} from '../contas.regras';

/** O que a linha mostra além do registro, calculado uma vez por carga. */
interface MetaConta {
  aparencia: AparenciaCategoria;
  icone: string;
  vencimento: string;
  semVencimento: boolean;
  /** Parcelas pagas em %, para a barra; null se não é parcelada. */
  progresso: number | null;
  parecidos: string[];
}

/**
 * Cadastro de Contas no layout novo (card #22): cabeçalho com Exportar, resumo em cards, barra de filtros
 * (situação com contador, busca, categorias, ordem) e tabela própria. Carga, formulário e exclusão vêm da base.
 */
@Component({
  selector: 'app-conta-mensal-list',
  templateUrl: './conta-mensal-list.component.html',
  styleUrls: ['./conta-mensal-list.component.scss']
})
export class ContaMensalListComponent extends CadastroListBase<ContaDto> {
  protected readonly rotulo = { singular: 'conta', plural: 'contas', feminino: true };

  private readonly contaService = inject(ContaService);
  private readonly categoryService = inject(CategoryService);
  readonly movel = inject(LarguraTelaService).movel;

  @ViewChild('tabela') tabela?: Table;

  readonly breadcrumb: MenuItem[] = [{ label: 'Cadastros' }, { label: 'Contas' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };
  readonly opcoesOrdem: { label: string; value: OrdemContas }[] = [
    { label: 'Vencimento', value: 'vencimento' },
    { label: 'Nome (A–Z)', value: 'nome' },
    { label: 'Maior valor', value: 'valor' },
    { label: 'Categoria', value: 'categoria' }
  ];
  readonly colunasExportacao = [
    { field: 'nome', header: 'Conta' },
    { field: 'categoriaNome', header: 'Categoria' },
    { field: 'valor', header: 'Valor por mês' },
    { field: 'vencimentos', header: 'Vencimento' },
    { field: 'parcelaAtual', header: 'Parcela' },
    { field: 'ativo', header: 'Situação' },
    { field: 'observacao', header: 'Observação' }
  ];

  categorias: CategoriaDto[] = [];
  opcoesCategoria: { label: string; value: number }[] = [];

  situacao: FiltroSituacao = 'ativas';
  busca = '';
  categoriasSelecionadas: number[] = [];
  ordem: OrdemContas = 'vencimento';
  /** Celular: categorias e ordem num painel de baixo. */
  filtrosMovelAbertos = false;

  /**
   * Abas Ativas / Inativas / Todas com contador. Campo recalculado só no filtro: um getter devolveria objetos novos
   * a cada detecção de mudanças, o p-selectButton recriaria os botões no meio do clique e a aba não trocaria (#23).
   */
  opcoesSituacao: { label: string; value: FiltroSituacao; contagem: number }[] = [];
  resumo: ResumoContas = { ativas: 0, receitasMes: 0, despesasMes: 0, saldoMes: 0, parceladasEmAndamento: 0, inativas: 0 };
  meta: Record<number, MetaConta> = {};
  private contaDoMenu: ContaDto | null = null;
  readonly itensMenu: MenuItem[] = [
    { label: 'Ver lançamentos', icon: 'pi pi-chart-bar', command: () => this.contaDoMenu && this.verLancamentos(this.contaDoMenu) },
    { label: 'Excluir', icon: 'pi pi-trash', styleClass: 'item-excluir', command: () => this.contaDoMenu && this.onDelete(this.contaDoMenu) }
  ];
  /** Conta com o painel de lançamentos aberto (⋮ "Ver lançamentos", card #22). */
  contaDosLancamentos: ContaDto | null = null;

  get temFiltro(): boolean {
    return this.situacao !== 'ativas' || !!this.busca || this.categoriasSelecionadas.length > 0;
  }

  /** Categorias que o formulário oferece: as ativas e, na edição, a da própria conta mesmo inativa. */
  get categoriasDoForm(): CategoriaDto[] {
    const atual = this.editing?.categoriaId;
    return this.categorias.filter(c => c.ativo || c.id === atual);
  }

  protected override antesDeCarregar(): Observable<unknown> {
    return this.categoryService.listar().pipe(tap(categorias => {
      this.categorias = categorias;
      this.opcoesCategoria = [...categorias]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(c => ({ label: c.nome, value: c.id }));
    }));
  }

  protected buscar(): Observable<ContaDto[]> {
    return this.contaService.listar();
  }

  protected excluirRegistro(id: number) {
    return this.contaService.excluir(id);
  }

  protected nomeDe(conta: ContaDto): string {
    return conta.nome;
  }

  private get filtro(): FiltroContas {
    return { situacao: this.situacao, busca: this.busca, categorias: this.categoriasSelecionadas, ordem: this.ordem };
  }

  override applyFilters() {
    const porCategoria = new Map(this.categorias.map(c => [c.id, c]));
    const parecidos = nomesParecidos(this.registros);
    this.meta = {};
    for (const conta of this.registros) {
      const categoria = porCategoria.get(conta.categoriaId);
      const dias = diasDaConta(conta);
      this.meta[conta.id] = {
        aparencia: categoria ? aparenciaDe(categoria) : { natureza: null },
        icone: iconeDe(categoria ?? { nome: conta.categoriaNome }),
        vencimento: textoVencimento(dias),
        semVencimento: !dias.length,
        progresso: conta.ehParcelado && conta.quantidadeParcelas
          ? Math.min(100, Math.round((Math.max(0, conta.parcelaAtual - 1) / conta.quantidadeParcelas) * 100))
          : null,
        parecidos: parecidos.get(conta.id) ?? []
      };
    }
    this.resumo = resumoDasContas(this.registros, id => !!porCategoria.get(id) && ehReceita(porCategoria.get(id)!));
    const contagem = contarPorSituacao(this.registros, this.filtro);
    this.opcoesSituacao = [
      { label: 'Ativas', value: 'ativas', contagem: contagem.ativas },
      { label: 'Inativas', value: 'inativas', contagem: contagem.inativas },
      { label: 'Todas', value: 'todas', contagem: contagem.todas }
    ];
    this.registrosExibidos = filtrarContas(this.registros, this.filtro);
  }

  aoMudarFiltro() {
    this.applyFilters();
  }

  limparFiltros() {
    this.situacao = 'ativas';
    this.busca = '';
    this.categoriasSelecionadas = [];
    this.applyFilters();
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  /** "+ R$ 925,80" / "− R$ 510,00": o sinal na frente, para o saldo não parecer um total. */
  get saldoTexto(): string {
    const { saldoMes } = this.resumo;
    return `${saldoMes < 0 ? '−' : '+'} ${formatCurrencyBR(Math.abs(saldoMes))}`;
  }

  /** Abre o formulário com a cópia como conta nova (id 0): "(cópia)" no nome e parcelas da 1ª. */
  duplicar(conta: ContaDto) {
    this.editing = duplicarConta(conta);
    this.showModalForm = true;
  }

  abrirMenu(conta: ContaDto) {
    this.contaDoMenu = conta;
  }

  verLancamentos(conta: ContaDto) {
    this.contaDosLancamentos = conta;
  }

  /** "Editar conta" no painel de lançamentos: fecha o painel e abre a edição da mesma conta. */
  editarDosLancamentos() {
    const conta = this.contaDosLancamentos;
    this.contaDosLancamentos = null;
    if (conta) this.onEdit(conta);
  }

  exportar() {
    this.tabela?.exportCSV();
  }

  /** CSV legível: valor, dias, parcela e situação como na tela. */
  readonly formatarExportacao = ({ data, field }: { data: unknown; field: string }) => {
    if (field === 'valor') return formatCurrencyBR(data, { simbolo: false });
    if (field === 'vencimentos') return textoVencimento(((data as ContaDto['vencimentos']) ?? []).map(v => v.dia));
    if (field === 'ativo') return data ? 'Ativa' : 'Inativa';
    return data ?? '';
  };

  /** Switch "Ativa" da linha: grava na hora (com os dias, que a API exige) e volta se der erro. */
  alternarAtivo(conta: ContaDto, ativo: boolean) {
    this.trocarAtivo(conta.id, ativo);
    this.contaService.atualizar({ ...conta, ativo, dataOperacao: diasDaConta(conta) }).subscribe({
      next: () => this.alertService.success(ativo ? 'Conta ativada.' : 'Conta inativada. Ela deixa de gerar lançamentos.'),
      error: e => {
        this.trocarAtivo(conta.id, !ativo);
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a conta.'));
      }
    });
  }

  private trocarAtivo(id: number, ativo: boolean) {
    this.registros = this.registros.map(c => (c.id === id ? { ...c, ativo } : c));
    this.applyFilters();
  }
}
