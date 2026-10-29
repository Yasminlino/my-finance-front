import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { CategoryService } from 'src/app/core/services/category.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { NavegacaoService } from 'src/app/core/services/navegacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { NaturezaOperacao } from 'src/app/shared/enums/natureza-operacao.enum';
import { classeDaNatureza } from 'src/app/shared/ui/natureza';
import { iconeDe } from 'src/app/shared/ui/aparencia';
import {
  FiltroCategorias, FiltroSituacao, FiltroTipo, OrdemCategorias, ResumoCategorias, contarPorTipo, ehReceita, filtrarCategorias, nomesParecidos,
  resumoDasCategorias, tipoNaturezaIncompativel
} from '../categorias.regras';

/** Rótulo curto da natureza no chip e no filtro. Partial: um código fora da lista cai no número no chip. */
export const ROTULO_NATUREZA: Partial<Record<number, string>> = {
  [NaturezaOperacao.RendimentoEntrada]: 'Rendimento / Entrada',
  [NaturezaOperacao.Essencial]: 'Essencial',
  [NaturezaOperacao.EstilodeVidaLazer]: 'Estilo de vida / Lazer',
  [NaturezaOperacao.ReservaInvestimento]: 'Reserva / Investimentos',
  [NaturezaOperacao.Pessoal]: 'Pessoal',
  [NaturezaOperacao.Empresa]: 'Empresa'
};

/** O que a linha mostra além do registro, calculado uma vez por carga ou filtro. */
interface MetaCategoria {
  icone: string;
  receita: boolean;
  classeNatureza: string;
  incompativel: boolean;
  /** Nomes parecidos com o desta categoria (aviso de possível duplicata). */
  parecidos: string[];
}

/**
 * Cadastro de Categorias no layout novo (card #23): cabeçalho, resumo com a barra de natureza, barra de filtros
 * (tipo com contador, busca, natureza, inativas) e tabela própria. Carga, formulário e exclusão vêm da base.
 */
@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.scss']
})
export class CategoriaListComponent extends CadastroListBase<CategoriaDto> {
  protected readonly rotulo = { singular: 'categoria', plural: 'categorias', feminino: true };

  private readonly categoryService = inject(CategoryService);
  private readonly confirmacaoAtivo = inject(ConfirmacaoService);
  readonly movel = inject(LarguraTelaService).movel;
  /** ‹ voltar do cabeçalho: tela anterior ou a Página Inicial. */
  readonly navegacao = inject(NavegacaoService);

  readonly breadcrumb: MenuItem[] = [{ label: 'Cadastros' }, { label: 'Categorias' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };
  readonly rotuloNatureza = ROTULO_NATUREZA;
  readonly opcoesNatureza = Object.entries(ROTULO_NATUREZA).map(([value, label]) => ({ label, value: Number(value) }));

  readonly opcoesSituacao: { label: string; value: FiltroSituacao }[] = [
    { label: 'Ativas', value: 'ativas' },
    { label: 'Inativas', value: 'inativas' },
    { label: 'Todas', value: 'todas' }
  ];

  readonly opcoesOrdem: { label: string; value: OrdemCategorias }[] = [
    { label: 'Tipo (receitas primeiro)', value: 'tipo' },
    { label: 'Nome (A–Z)', value: 'nome' },
    { label: 'Nome (Z–A)', value: 'nome-desc' },
    { label: 'Mais contas', value: 'contas' },
    { label: 'Natureza', value: 'natureza' }
  ];

  filtroTipo: FiltroTipo = 'todas';
  busca = '';
  naturezasSelecionadas: number[] = [];
  situacao: FiltroSituacao = 'ativas';
  ordem: OrdemCategorias = 'tipo';
  /** Celular: natureza e inativas num painel de baixo. */
  filtrosMovelAbertos = false;

  contagem: Record<FiltroTipo, number> = { todas: 0, despesas: 0, receitas: 0 };
  resumo: ResumoCategorias = { despesas: 0, receitas: 0, despesasPorNatureza: [], aRevisar: 0 };
  meta: Record<number, MetaCategoria> = {};
  /** Categoria do menu ⋮ aberto. */
  categoriaDoMenu: CategoriaDto | null = null;
  readonly itensMenu: MenuItem[] = [
    { label: 'Excluir', icon: 'pi pi-trash', styleClass: 'item-excluir', command: () => this.categoriaDoMenu && this.onDelete(this.categoriaDoMenu) }
  ];

  /**
   * Abas Todas / Despesas / Receitas com contador. Campo recalculado só no filtro: um getter devolveria objetos novos
   * a cada detecção de mudanças, o p-selectButton recriaria os botões no meio do clique e a aba não trocaria.
   */
  opcoesTipo: { label: string; value: FiltroTipo; contagem: number }[] = [];

  get temFiltro(): boolean {
    return this.filtroTipo !== 'todas' || !!this.busca || this.naturezasSelecionadas.length > 0 || this.situacao !== 'ativas';
  }

  /** Despesas agrupadas por tipo no celular. */
  get despesasExibidas(): CategoriaDto[] {
    return this.registrosExibidos.filter(c => !this.meta[c.id]?.receita);
  }

  get receitasExibidas(): CategoriaDto[] {
    return this.registrosExibidos.filter(c => this.meta[c.id]?.receita);
  }

  protected buscar(): Observable<CategoriaDto[]> {
    return this.categoryService.listar();
  }

  protected excluirRegistro(id: number) {
    return this.categoryService.excluir(id);
  }

  protected nomeDe(categoria: CategoriaDto): string {
    return categoria.nome;
  }

  private get filtro(): FiltroCategorias {
    return { tipo: this.filtroTipo, busca: this.busca, naturezas: this.naturezasSelecionadas, situacao: this.situacao, ordem: this.ordem };
  }

  override applyFilters() {
    const parecidos = nomesParecidos(this.registros);
    this.meta = {};
    for (const categoria of this.registros) {
      this.meta[categoria.id] = {
        icone: iconeDe(categoria),
        receita: ehReceita(categoria),
        classeNatureza: classeDaNatureza(categoria.naturezaOperacao),
        incompativel: tipoNaturezaIncompativel(categoria),
        parecidos: parecidos.get(categoria.id) ?? []
      };
    }
    this.resumo = resumoDasCategorias(this.registros);
    this.contagem = contarPorTipo(this.registros, this.filtro);
    this.opcoesTipo = [
      { label: 'Todas', value: 'todas', contagem: this.contagem.todas },
      { label: 'Despesas', value: 'despesas', contagem: this.contagem.despesas },
      { label: 'Receitas', value: 'receitas', contagem: this.contagem.receitas }
    ];
    this.registrosExibidos = filtrarCategorias(this.registros, this.filtro);
  }

  aoMudarFiltro() {
    this.applyFilters();
  }

  limparFiltros() {
    this.filtroTipo = 'todas';
    this.busca = '';
    this.naturezasSelecionadas = [];
    this.situacao = 'ativas';
    this.applyFilters();
  }

  /** Largura (em %) do pedaço da barra de natureza. */
  fatia(quantidade: number): number {
    const total = this.resumo.despesas;
    return total ? (quantidade / total) * 100 : 0;
  }

  plural(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }

  abrirMenu(categoria: CategoriaDto) {
    this.categoriaDoMenu = categoria;
  }

  /** Switch "Ativa" da linha: grava na hora; inativar categoria com contas pede confirmação antes. */
  async alternarAtivo(categoria: CategoriaDto, ativo: boolean) {
    const contas = categoria.quantidadeContas ?? 0;
    if (!ativo && contas > 0) {
      const ok = await this.confirmacaoAtivo.confirmar(
        `"${categoria.nome}" é usada em ${this.plural(contas, 'conta', 'contas')}. Inativar? Ela deixa de aparecer para contas novas; as que já existem continuam com ela.`,
        { titulo: 'Inativar categoria', aceitar: 'Inativar' });
      if (!ok) {
        this.trocarAtivo(categoria.id, true);
        return;
      }
    }

    this.trocarAtivo(categoria.id, ativo);
    const { quantidadeContas: _, ...dto } = categoria;
    this.categoryService.atualizar({ ...dto, ativo }).subscribe({
      next: () => this.alertService.success(ativo ? 'Categoria ativada.' : 'Categoria inativada.'),
      error: e => {
        this.trocarAtivo(categoria.id, !ativo);
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a categoria.'));
      }
    });
  }

  private trocarAtivo(id: number, ativo: boolean) {
    this.registros = this.registros.map(c => (c.id === id ? { ...c, ativo } : c));
    this.applyFilters();
  }

  /** Categoria com contas: a API recusa a exclusão; avisa antes e sugere inativar. */
  override async onDelete(categoria: CategoriaDto) {
    const contas = categoria.quantidadeContas ?? 0;
    if (contas > 0) {
      this.alertService.info(
        `"${categoria.nome}" é usada em ${this.plural(contas, 'conta', 'contas')} e não pode ser excluída. Inative-a para ela não aparecer em contas novas.`);
      return;
    }
    await super.onDelete(categoria);
  }
}
