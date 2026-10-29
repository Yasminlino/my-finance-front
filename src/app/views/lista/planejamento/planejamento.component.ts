import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { concatMap, finalize, forkJoin, from, toArray } from 'rxjs';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { AdicionarItemComponent } from '../components/adicionar-item/adicionar-item.component';
import { DuplicarPlanejamentoComponent } from '../components/duplicar-planejamento/duplicar-planejamento.component';
import { ItemPlanejamentoFormComponent } from '../components/item-planejamento-form/item-planejamento-form.component';
import { PlanejamentoFormComponent } from '../components/planejamento-form/planejamento-form.component';
import { chipsDosCampos, corDaLista, iconeDaLista, rotaDaLista } from '../listas.regras';
import {
  FiltroItens, ResumoDosItens, contarItens, csvDosItens, filtrarItens, resumoDosItens, rotuloDosFeitos, separarPorFeito, textoDosPendentes,
  totalDoItem
} from '../planejamento.regras';

/** Ação do ⋮ (desktop) e do bottom sheet (celular). */
interface AcaoDaTela {
  rotulo: string;
  icone: string;
  perigo?: boolean;
  executar: () => void;
}

/** Botão do aviso (toast): Desfazer depois das ações em lote, Abrir depois de duplicar. */
interface BotaoDoAviso {
  rotulo: string;
  icone: string;
  acao: () => void;
  /** Segundo botão (ex.: "Ver comparação" depois de duplicar, card #68). */
  segundo?: BotaoDoAviso;
}

/**
 * Tela interna do planejamento (card #66): uma só para todo planejamento, no lugar das de orçamento, checagem e
 * cronograma. Colunas, resumo, adicionar rápido e formulário seguem os campos ligados. Arquivado abre só para leitura.
 */
@Component({
  selector: 'app-planejamento',
  standalone: true,
  imports: [
    NgTemplateOutlet, FormsModule, BadgeModule, ButtonModule, CheckboxModule, IconFieldModule, InputIconModule, InputSwitchModule, InputTextModule,
    MenuModule, MessageModule, ProgressBarModule, SelectButtonModule, SidebarModule, SkeletonModule, ToastModule,
    CategoryIconComponent, EmptyStateComponent, FilterBarComponent, PageHeaderComponent, StatCardComponent,
    AdicionarItemComponent, DuplicarPlanejamentoComponent, ItemPlanejamentoFormComponent, PlanejamentoFormComponent
  ],
  templateUrl: './planejamento.component.html',
  styleUrls: ['./planejamento.component.scss'],
  // MessageService próprio: o aviso com Desfazer sai no p-toast desta tela, não no global.
  providers: [MessageService]
})
export class PlanejamentoComponent implements OnInit {
  private readonly listaService = inject(ListaService);
  private readonly itemService = inject(ItemListaService);
  private readonly alertService = inject(AlertService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly mensagens = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly movel = inject(LarguraTelaService).movel;
  private readonly rota = inject(ActivatedRoute);
  /** Da rota; muda sem recriar a tela (ex.: Abrir a cópia depois de duplicar). */
  id = 0;

  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };

  loading = false;
  lista: ListaDto | null = null;
  itens: ItemListaDto[] = [];

  filtro: FiltroItens = 'TODOS';
  busca = '';
  ocultarFeitos = false;
  feitosAbertos = true;
  /** Recalculado só em aplicar() (lição do #23: getter recriaria as opções e o p-selectButton não trocaria). */
  opcoesFiltro: { label: string; value: FiltroItens; contagem: number }[] = [];
  resumo: ResumoDosItens = resumoDosItens([], { modoValor: 'TOTAL', usaLimite: false });
  pendentes: ItemListaDto[] = [];
  feitos: ItemListaDto[] = [];

  /** Itens com o toggle em andamento (evita clique duplo). */
  private marcando = new Set<number>();

  /** Seleção em lote (parte 2): clicar no item seleciona em vez de abrir a edição. */
  selecionando = false;
  selecionados = new Set<number>();
  private toqueLongo: ReturnType<typeof setTimeout> | null = null;
  /** O toque longo terminou com um clique: esse clique não deve desfazer a seleção recém-feita. */
  private ignorarProximoToque = false;

  itemAberto = false;
  itemEditando: ItemListaDto | null = null;
  camposAbertos = false;
  duplicando = false;
  itensMenu: MenuItem[] = [];
  acoesAbertas = false;

  get somenteLeitura(): boolean {
    return !!this.lista?.arquivadaEm;
  }

  /**
   * Campo, não getter: um modelo novo a cada detecção recria os routerLink do p-breadcrumb e a tela entra em laço
   * (travou o navegador na validação). Recalculado quando o planejamento carrega.
   */
  breadcrumb: MenuItem[] = [{ label: 'Planejamento' }, { label: 'Meus planejamentos', routerLink: '/planejamento' }];

  private montarBreadcrumb() {
    const itens: MenuItem[] = [{ label: 'Planejamento' }, { label: 'Meus planejamentos', routerLink: '/planejamento' }];
    if (this.somenteLeitura) itens.push({ label: 'Arquivados', routerLink: '/planejamento/arquivados' });
    itens.push({ label: this.lista?.nome ?? '' });
    this.breadcrumb = itens;
  }

  get chips(): string[] {
    return this.lista ? chipsDosCampos(this.lista) : [];
  }

  get cor(): string {
    return this.lista ? corDaLista(this.lista) : 'azul';
  }

  get icone(): string {
    return this.lista ? iconeDaLista(this.lista) : 'pi pi-clipboard';
  }

  get rotuloFeitos(): string {
    return this.lista ? rotuloDosFeitos(this.lista.modelo) : 'Feitos';
  }

  get temFiltro(): boolean {
    return this.filtro !== 'TODOS' || !!this.busca.trim();
  }

  /** Unitário mostra Valor un. e Total; no modo total o valor já é o total, e fica uma coluna só. */
  get valorUnitario(): boolean {
    return this.lista?.modoValor === 'UNITARIO';
  }

  /** Colunas da tabela (desktop) conforme os campos ligados. */
  get colunas(): string {
    const l = this.lista;
    if (!l) return '';
    const partes = ['2.5rem', 'minmax(10rem, 1fr)'];
    if (l.usaQuantidade) partes.push('4.5rem');
    if (l.usaValor) partes.push(...(this.valorUnitario ? ['8rem', '8rem'] : ['8rem']));
    if (l.usaData) partes.push('8rem');
    if (l.usaObservacao) partes.push('minmax(8rem, 0.8fr)');
    partes.push('3rem');
    return partes.join(' ');
  }

  /** O Angular reaproveita a tela quando só o :id muda: sem acompanhar o paramMap, ficava o planejamento anterior. */
  ngOnInit() {
    this.rota.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(parametros => {
      this.id = Number(parametros.get('id'));
      this.lista = null;
      this.itens = [];
      this.limparFiltros();
      this.sairSelecao();
      this.load();
    });
  }

  load() {
    this.loading = true;
    forkJoin({ lista: this.listaService.obterPorId(this.id), itens: this.itemService.listarDaLista(this.id) })
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lista, itens }) => {
          this.lista = lista;
          this.itens = itens;
          this.montarBreadcrumb();
          this.aplicar();
        },
        error: e => {
          // Excluído ou de outra pessoa: a API responde 404 com "Lista não encontrada"; na tela é "planejamento".
          if (e?.status === 404) {
            this.alertService.error('Planejamento não encontrado.');
            this.router.navigate(['/planejamento']);
            return;
          }
          this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o planejamento.'));
        }
      });
  }

  aplicar() {
    if (!this.lista) return;
    const contagem = contarItens(this.itens);
    this.opcoesFiltro = [
      { label: 'Todos', value: 'TODOS', contagem: contagem.TODOS },
      { label: 'Falta', value: 'FALTA', contagem: contagem.FALTA },
      { label: this.rotuloFeitos, value: 'FEITOS', contagem: contagem.FEITOS }
    ];
    this.resumo = resumoDosItens(this.itens, this.lista);
    const grupos = separarPorFeito(filtrarItens(this.itens, this.filtro, this.busca));
    this.pendentes = grupos.pendentes;
    this.feitos = this.ocultarFeitos && this.filtro !== 'FEITOS' ? [] : grupos.feitos;
  }

  limparFiltros() {
    this.filtro = 'TODOS';
    this.busca = '';
    this.aplicar();
  }

  // ---- exibição ----

  moeda(valor: number | null | undefined): string {
    return formatCurrencyBR(valor ?? 0);
  }

  totalDe(item: ItemListaDto): number | null {
    return this.lista ? totalDoItem(item, this.lista) : null;
  }

  /** "30/10 · 07:30" (data de calendário, sem fuso). */
  dataDe(item: ItemListaDto): string {
    if (!item.data) return '';
    const dia = `${item.data.slice(8, 10)}/${item.data.slice(5, 7)}`;
    return item.hora ? `${dia} · ${item.hora.slice(0, 5)}` : dia;
  }

  repete(item: ItemListaDto): boolean {
    return !!item.repeticao && item.repeticao !== 'NENHUMA';
  }

  // ---- itens ----

  /** Marca/desmarca em 1 clique; a tela muda na hora e volta se a API falhar. */
  alternar(item: ItemListaDto) {
    if (this.somenteLeitura || !this.lista || this.marcando.has(item.id)) return;
    const feito = !item.feito;
    this.marcando.add(item.id);
    this.trocarFeito([item.id], feito);
    this.itemService.marcarFeito(this.lista.id, [item.id], feito)
      .pipe(finalize(() => this.marcando.delete(item.id)))
      .subscribe({
        error: e => {
          this.trocarFeito([item.id], !feito);
          this.alertService.error(extrairMensagemErro(e, 'Não deu para marcar o item.'));
        }
      });
  }

  private trocarFeito(ids: number[], feito: boolean) {
    const alvo = new Set(ids);
    this.itens = this.itens.map(i => (alvo.has(i.id) ? { ...i, feito } : i));
    this.aplicar();
  }

  aoAdicionar(item: ItemListaDto) {
    this.itens = [...this.itens, item];
    this.aplicar();
  }

  novoItem() {
    this.itemEditando = null;
    this.itemAberto = true;
  }

  editarItem(item: ItemListaDto) {
    if (this.somenteLeitura) return;
    this.itemEditando = item;
    this.itemAberto = true;
  }

  fecharItem(recarregar: boolean) {
    this.itemAberto = false;
    this.itemEditando = null;
    if (recarregar) this.load();
  }

  // ---- seleção em lote (parte 2) ----

  get somaSelecionados(): number {
    if (!this.lista) return 0;
    return resumoDosItens(this.itens.filter(i => this.selecionados.has(i.id)), this.lista).total;
  }

  /** Clique no item: seleciona no modo de seleção; senão, abre a edição. */
  tocarItem(item: ItemListaDto) {
    if (this.ignorarProximoToque) {
      this.ignorarProximoToque = false;
      return;
    }
    if (this.selecionando) this.alternarSelecao(item);
    else this.editarItem(item);
  }

  entrarSelecao(item?: ItemListaDto) {
    if (this.somenteLeitura) return;
    this.selecionando = true;
    if (item) this.selecionados.add(item.id);
  }

  sairSelecao() {
    this.selecionando = false;
    this.selecionados = new Set();
  }

  alternarSelecao(item: ItemListaDto) {
    const proximo = new Set(this.selecionados);
    if (proximo.has(item.id)) proximo.delete(item.id);
    else proximo.add(item.id);
    this.selecionados = proximo;
  }

  /** Os itens visíveis no filtro e na busca. */
  selecionarTodos() {
    this.selecionados = new Set([...this.pendentes, ...this.feitos].map(i => i.id));
  }

  /** Celular: segurar ~0,5 s num item entra na seleção com ele marcado. */
  iniciarToqueLongo(item: ItemListaDto) {
    if (!this.movel() || this.somenteLeitura || this.selecionando) return;
    this.cancelarToqueLongo();
    this.toqueLongo = setTimeout(() => {
      this.toqueLongo = null;
      this.ignorarProximoToque = true;
      this.entrarSelecao(item);
      navigator.vibrate?.(30);
    }, 500);
  }

  cancelarToqueLongo() {
    if (this.toqueLongo) clearTimeout(this.toqueLongo);
    this.toqueLongo = null;
  }

  /** Uma requisição só (PATCH /itens/feito); a tela muda na hora e volta se falhar. */
  marcarSelecionados(feito: boolean) {
    if (!this.lista || !this.selecionados.size) return;
    const ids = [...this.selecionados];
    const antes = new Map(this.itens.filter(i => this.selecionados.has(i.id)).map(i => [i.id, !!i.feito]));
    this.trocarFeito(ids, feito);
    this.sairSelecao();
    this.itemService.marcarFeito(this.lista.id, ids, feito).subscribe({
      error: e => {
        this.itens = this.itens.map(i => (antes.has(i.id) ? { ...i, feito: antes.get(i.id)! } : i));
        this.aplicar();
        this.alertService.error(extrairMensagemErro(e, 'Não deu para marcar os itens.'));
      }
    });
  }

  /** A API não tem exclusão em lote: um por vez, com Desfazer que recria os itens. */
  async excluirSelecionados() {
    if (!this.lista || !this.selecionados.size) return;
    const apagados = this.itens.filter(i => this.selecionados.has(i.id));
    const ok = await this.confirmacao.confirmar(
      `Excluir ${apagados.length === 1 ? `o item "${apagados[0].descricao}"` : `os ${apagados.length} itens selecionados`}?`,
      { titulo: 'Excluir itens' });
    if (!ok) return;

    const listaId = this.lista.id;
    this.sairSelecao();
    from(apagados).pipe(
      concatMap(item => this.itemService.excluir(listaId, item.id)),
      toArray()
    ).subscribe({
      next: () => {
        this.avisar('Itens excluídos', `${apagados.length} ${apagados.length === 1 ? 'item excluído' : 'itens excluídos'}.`,
          { rotulo: 'Desfazer', icone: 'pi pi-undo', acao: () => this.recriar(listaId, apagados) });
        this.load();
      },
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Não deu para excluir todos os itens.'));
        this.load();
      }
    });
  }

  // ---- compartilhar e exportar (parte 2) ----

  /** Celular: o compartilhar do aparelho (WhatsApp e outros); computador: copia o texto. */
  async compartilharPendentes() {
    if (!this.lista) return;
    const texto = textoDosPendentes(this.lista, this.itens);
    try {
      if (this.movel() && navigator.share) {
        await navigator.share({ title: this.lista.nome, text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      this.alertService.success('Pendentes copiados. É só colar na conversa.');
    } catch (e) {
      // Fechar o compartilhar do aparelho não é erro.
      if ((e as DOMException)?.name !== 'AbortError') this.alertService.error('Não deu para compartilhar os pendentes.');
    }
  }

  exportarCsv() {
    if (!this.lista) return;
    const csv = csvDosItens(this.lista, this.itens);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `planejamento-${this.nomeDeArquivo(this.lista.nome)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** "Gastos do mês" -> "gastos-do-mes". */
  private nomeDeArquivo(nome: string): string {
    return nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'itens';
  }

  // ---- ações em lote do planejamento ----

  async desmarcarTodos() {
    if (!this.lista || this.somenteLeitura) return;
    const ids = this.itens.filter(i => i.feito).map(i => i.id);
    if (!ids.length) return;
    const ok = await this.confirmacao.confirmar(
      `Desmarcar ${ids.length === 1 ? 'o item feito' : `os ${ids.length} itens feitos`}? Todos voltam para pendentes.`,
      { titulo: 'Desmarcar todos', aceitar: 'Desmarcar' });
    if (!ok) return;

    const listaId = this.lista.id;
    this.itemService.desmarcarTodos(listaId).subscribe({
      next: () => {
        this.avisar('Itens desmarcados', `${ids.length} ${ids.length === 1 ? 'item voltou' : 'itens voltaram'} para pendentes.`,
          { rotulo: 'Desfazer', icone: 'pi pi-undo', acao: () => this.remarcar(listaId, ids) });
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao desmarcar os itens.'))
    });
  }

  private remarcar(listaId: number, ids: number[]) {
    this.itemService.marcarFeito(listaId, ids, true).subscribe({
      next: () => this.load(),
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao desfazer.'))
    });
  }

  /** A API só apaga os que não repetem (o feito de quem repete é por ocorrência). */
  async excluirConcluidos() {
    if (!this.lista || this.somenteLeitura) return;
    const apagados = this.itens.filter(i => i.feito && !this.repete(i));
    if (!apagados.length) {
      this.alertService.info('Nenhum item concluído para excluir.');
      return;
    }
    const ok = await this.confirmacao.confirmar(
      `Excluir ${apagados.length === 1 ? 'o item concluído' : `os ${apagados.length} itens concluídos`}?`,
      { titulo: 'Excluir concluídos' });
    if (!ok) return;

    const listaId = this.lista.id;
    this.itemService.excluirConcluidos(listaId).subscribe({
      next: () => {
        this.avisar('Concluídos excluídos', `${apagados.length} ${apagados.length === 1 ? 'item excluído' : 'itens excluídos'}.`,
          { rotulo: 'Desfazer', icone: 'pi pi-undo', acao: () => this.recriar(listaId, apagados) });
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir os concluídos.'))
    });
  }

  /** Desfazer de uma exclusão: cria de novo, um por vez, como estavam (os ids mudam). */
  private recriar(listaId: number, itens: ItemListaDto[]) {
    from(itens).pipe(
      concatMap(({ id: _id, listaId: _l, feitoEm: _f, itemOrigemId: _o, ...resto }) => this.itemService.criar(listaId, resto)),
      toArray()
    ).subscribe({
      next: () => this.load(),
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Não deu para recriar todos os itens.'));
        this.load();
      }
    });
  }

  // ---- planejamento ----

  abrirCampos() {
    this.camposAbertos = true;
  }

  fecharCampos(recarregar: boolean) {
    this.camposAbertos = false;
    if (recarregar) this.load();
  }

  duplicar() {
    this.duplicando = true;
  }

  aoDuplicar(copia: ListaDto) {
    this.duplicando = false;
    this.avisar('Planejamento duplicado', `"${copia.nome}" foi criado.`,
      {
        rotulo: 'Abrir', icone: 'pi pi-external-link', acao: () => this.router.navigate(rotaDaLista(copia)),
        segundo: { rotulo: 'Ver comparação', icone: 'pi pi-chart-bar', acao: () => this.router.navigate(['/planejamento', String(copia.id), 'comparar']) }
      });
    this.load();
  }

  arquivar() {
    if (!this.lista) return;
    const lista = this.lista;
    this.listaService.arquivar(lista.id).subscribe({
      next: () => {
        this.avisar('Planejamento arquivado', `"${lista.nome}" foi para Arquivados e agora abre só para leitura.`,
          { rotulo: 'Desfazer', icone: 'pi pi-undo', acao: () => this.desarquivar() });
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao arquivar o planejamento.'))
    });
  }

  desarquivar() {
    if (!this.lista) return;
    this.listaService.desarquivar(this.lista.id).subscribe({
      next: () => {
        this.alertService.success('Planejamento desarquivado.');
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao desarquivar o planejamento.'))
    });
  }

  async excluirPlanejamento() {
    if (!this.lista) return;
    const lista = this.lista;
    const n = this.itens.length;
    const dosItens = n === 0 ? '' : n === 1 ? ' e o item dele' : ` e os ${n} itens dele`;
    const ok = await this.confirmacao.confirmar(`Excluir o planejamento "${lista.nome}"${dosItens}? Não dá para desfazer.`,
      { titulo: 'Excluir planejamento' });
    if (!ok) return;
    this.listaService.excluir(lista.id).subscribe({
      next: () => {
        this.alertService.success('Planejamento excluído.');
        this.router.navigate(['/planejamento']);
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir o planejamento.'))
    });
  }

  /** ‹ do cabeçalho: o nível de cima (Meus planejamentos ou Arquivados). */
  voltar() {
    this.router.navigate(this.somenteLeitura ? ['/planejamento', 'arquivados'] : ['/planejamento']);
  }

  // ---- menu ⋮ / bottom sheet ----

  acoes(): AcaoDaTela[] {
    // Compartilhar e exportar só leem: valem também no arquivado.
    const leitura: AcaoDaTela[] = [
      { rotulo: 'Comparar com anterior', icone: 'pi pi-chart-bar', executar: () => this.router.navigate(['/planejamento', String(this.id), 'comparar']) },
      { rotulo: 'Compartilhar pendentes', icone: 'pi pi-share-alt', executar: () => this.compartilharPendentes() },
      { rotulo: 'Exportar CSV', icone: 'pi pi-download', executar: () => this.exportarCsv() }
    ];
    if (this.somenteLeitura)
      return [
        { rotulo: 'Desarquivar', icone: 'pi pi-replay', executar: () => this.desarquivar() },
        ...leitura,
        { rotulo: 'Excluir planejamento', icone: 'pi pi-trash', perigo: true, executar: () => this.excluirPlanejamento() }
      ];
    const acoes: AcaoDaTela[] = [
      { rotulo: 'Campos e aparência', icone: 'pi pi-sliders-h', executar: () => this.abrirCampos() },
      { rotulo: 'Selecionar itens', icone: 'pi pi-check-square', executar: () => this.entrarSelecao() },
      ...leitura,
      { rotulo: 'Excluir concluídos', icone: 'pi pi-eraser', executar: () => this.excluirConcluidos() },
      { rotulo: 'Arquivar', icone: 'pi pi-inbox', executar: () => this.arquivar() },
      { rotulo: 'Excluir planejamento', icone: 'pi pi-trash', perigo: true, executar: () => this.excluirPlanejamento() }
    ];
    if (this.movel())
      acoes.unshift(
        { rotulo: 'Desmarcar todos', icone: 'pi pi-refresh', executar: () => this.desmarcarTodos() },
        { rotulo: 'Duplicar', icone: 'pi pi-copy', executar: () => this.duplicar() }
      );
    return acoes;
  }

  abrirMenu(evento: Event, menu: { toggle: (e: Event) => void }) {
    if (this.movel()) {
      this.acoesAbertas = true;
      return;
    }
    this.itensMenu = this.acoes().map(a => ({
      label: a.rotulo, icon: a.icone, styleClass: a.perigo ? 'item-excluir' : undefined, command: () => a.executar()
    }));
    menu.toggle(evento);
  }

  executarNoSheet(acao: AcaoDaTela) {
    this.acoesAbertas = false;
    acao.executar();
  }

  // ---- aviso com botão ----

  private avisar(titulo: string, texto: string, botao: BotaoDoAviso) {
    this.mensagens.clear('planejamento');
    this.mensagens.add({ key: 'planejamento', severity: 'success', summary: titulo, detail: texto, life: 10000, data: botao });
  }

  acionarAviso(botao: BotaoDoAviso) {
    this.mensagens.clear('planejamento');
    botao.acao();
  }
}
