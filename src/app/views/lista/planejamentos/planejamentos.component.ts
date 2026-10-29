import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { Observable, finalize, forkJoin, of } from 'rxjs';
import { ListaDto } from 'src/app/core/models/lista.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { NavegacaoService } from 'src/app/core/services/navegacao.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { PlanejamentoCardComponent } from '../components/planejamento-card/planejamento-card.component';
import { PlanejamentoFormComponent } from '../components/planejamento-form/planejamento-form.component';
import { DuplicarPlanejamentoComponent } from '../components/duplicar-planejamento/duplicar-planejamento.component';
import {
  FiltroPlanejamento, OrdemPlanejamento, contarPorFiltro, filtrarPlanejamentos, ordenarPlanejamentos, rotaDaLista
} from '../listas.regras';

/** Ação do menu ⋮ (desktop) e do bottom sheet (celular): a mesma lista nos dois. */
interface AcaoPlanejamento {
  rotulo: string;
  icone: string;
  perigo?: boolean;
  executar: (lista: ListaDto) => void;
}

/** Botão do aviso (toast) desta tela: Desfazer depois de arquivar, Abrir depois de duplicar. */
interface BotaoDoAviso {
  rotulo: string;
  icone: string;
  acao: () => void;
  /** Segundo botão (ex.: "Ver comparação" depois de duplicar, card #68). */
  segundo?: BotaoDoAviso;
}

/** Quantos nomes o card da pasta Arquivados mostra. */
const NOMES_NA_PASTA = 3;

/**
 * Meus planejamentos e a pasta Arquivados (card #63): a mesma tela, no modo que a rota diz (data.arquivados).
 * No front o usuário nunca vê "lista": é "planejamento". A API continua /listas.
 */
@Component({
  selector: 'app-planejamentos',
  standalone: true,
  imports: [
    FormsModule, RouterLink, BadgeModule, ButtonModule, DropdownModule, IconFieldModule, InputIconModule, InputTextModule,
    MenuModule, MessageModule, SelectButtonModule, SidebarModule, SkeletonModule, ToastModule,
    EmptyStateComponent, FabComponent, FilterBarComponent, PageHeaderComponent, PlanejamentoCardComponent, PlanejamentoFormComponent,
    DuplicarPlanejamentoComponent
  ],
  templateUrl: './planejamentos.component.html',
  styleUrls: ['./planejamentos.component.scss'],
  // MessageService próprio: o aviso com Desfazer sai no p-toast desta tela, não no global.
  providers: [MessageService]
})
export class PlanejamentosComponent implements OnInit {
  private readonly listaService = inject(ListaService);
  private readonly alertService = inject(AlertService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly mensagens = inject(MessageService);
  private readonly router = inject(Router);
  private readonly navegacao = inject(NavegacaoService);
  private readonly destroyRef = inject(DestroyRef);
  readonly movel = inject(LarguraTelaService).movel;

  /** Modo pasta: só os arquivados, com Desarquivar no lugar de Editar/Duplicar/Arquivar. */
  readonly arquivados: boolean = !!inject(ActivatedRoute).snapshot.data['arquivados'];

  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };
  readonly breadcrumb: MenuItem[] = this.arquivados
    ? [{ label: 'Planejamento' }, { label: 'Meus planejamentos', routerLink: '/planejamento' }, { label: 'Arquivados' }]
    : [{ label: 'Planejamento' }, { label: 'Meus planejamentos' }];

  readonly opcoesOrdem: { label: string; value: OrdemPlanejamento }[] = [
    { label: 'Mais recentes', value: 'RECENTES' },
    { label: 'Nome (A–Z)', value: 'NOME' }
  ];

  loading = false;
  listas: ListaDto[] = [];
  /** Só no modo normal: alimenta o card da pasta. */
  arquivadosNaPasta: ListaDto[] = [];
  exibidas: ListaDto[] = [];

  filtro: FiltroPlanejamento = 'TODOS';
  busca = '';
  ordem: OrdemPlanejamento = 'RECENTES';
  /**
   * Todos / Com valor / Com data com contador. Campo recalculado só no filtro (lição do #23): um getter
   * devolveria objetos novos a cada detecção e o p-selectButton não trocaria de opção.
   */
  opcoesFiltro: { label: string; value: FiltroPlanejamento; contagem: number }[] = [];

  /** Planejamento do menu ⋮ ou do bottom sheet aberto. */
  doMenu: ListaDto | null = null;
  itensMenu: MenuItem[] = [];
  acoesAbertas = false;

  formAberto = false;
  editando: ListaDto | null = null;
  /** Planejamento do diálogo Duplicar aberto. */
  duplicando: ListaDto | null = null;

  get temFiltro(): boolean {
    return this.filtro !== 'TODOS' || !!this.busca.trim();
  }

  get nomesNaPasta(): string {
    const nomes = this.arquivadosNaPasta.slice(0, NOMES_NA_PASTA).map(l => l.nome);
    const resto = this.arquivadosNaPasta.length - nomes.length;
    return nomes.join(', ') + (resto > 0 ? ` e mais ${resto}` : '');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const pasta$: Observable<ListaDto[]> = this.arquivados ? of([]) : this.listaService.listar(true);
    forkJoin({ listas: this.listaService.listar(this.arquivados), pasta: pasta$ })
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ listas, pasta }) => {
          this.listas = listas;
          this.arquivadosNaPasta = ordenarPlanejamentos(pasta, 'RECENTES');
          this.aplicarFiltros();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os planejamentos.'))
      });
  }

  aplicarFiltros() {
    const contagem = contarPorFiltro(this.listas);
    this.opcoesFiltro = [
      { label: 'Todos', value: 'TODOS', contagem: contagem.TODOS },
      { label: 'Com valor', value: 'VALOR', contagem: contagem.VALOR },
      { label: 'Com data', value: 'DATA', contagem: contagem.DATA }
    ];
    this.exibidas = ordenarPlanejamentos(filtrarPlanejamentos(this.listas, this.arquivados ? 'TODOS' : this.filtro, this.busca), this.ordem);
  }

  limparFiltros() {
    this.filtro = 'TODOS';
    this.busca = '';
    this.aplicarFiltros();
  }

  abrir(lista: ListaDto) {
    this.router.navigate(rotaDaLista(lista));
  }

  novo() {
    this.editando = null;
    this.formAberto = true;
  }

  editar(lista: ListaDto) {
    this.editando = lista;
    this.formAberto = true;
  }

  fecharForm(recarregar: boolean) {
    this.formAberto = false;
    this.editando = null;
    if (recarregar) this.load();
  }

  /** "Criar e abrir" do formulário. */
  abrirCriado(lista: ListaDto) {
    this.formAberto = false;
    this.abrir(lista);
  }

  /** ‹ do cabeçalho. Arquivados volta sempre para Meus planejamentos (é o nível de cima); Meus planejamentos, para a tela anterior. */
  voltar() {
    if (this.arquivados) this.router.navigate(['/planejamento']);
    else this.navegacao.voltar();
  }

  abrirPasta() {
    this.router.navigate(['/planejamento', 'arquivados']);
  }

  /** Ações do planejamento, na ordem do menu. */
  acoes(lista: ListaDto): AcaoPlanejamento[] {
    const abrir: AcaoPlanejamento = { rotulo: 'Abrir', icone: 'pi pi-external-link', executar: l => this.abrir(l) };
    const excluir: AcaoPlanejamento = { rotulo: 'Excluir', icone: 'pi pi-trash', perigo: true, executar: l => this.excluir(l) };
    // Comparar só lê: vale também nos arquivados (card #68).
    const comparar: AcaoPlanejamento = { rotulo: 'Comparar com anterior', icone: 'pi pi-chart-bar', executar: l => this.comparar(l) };
    if (this.arquivados || lista.arquivadaEm)
      return [abrir, comparar, { rotulo: 'Desarquivar', icone: 'pi pi-replay', executar: l => this.desarquivar(l) }, excluir];
    return [
      abrir,
      { rotulo: 'Editar', icone: 'pi pi-pencil', executar: l => this.editar(l) },
      { rotulo: 'Duplicar', icone: 'pi pi-copy', executar: l => this.duplicar(l) },
      comparar,
      { rotulo: 'Arquivar', icone: 'pi pi-inbox', executar: l => this.arquivar(l) },
      excluir
    ];
  }

  /** Comparar planejamentos (card #68): sem `com`, a API escolhe o anterior da série. */
  comparar(lista: ListaDto) {
    this.router.navigate(['/planejamento', String(lista.id), 'comparar']);
  }

  /** ⋮ no desktop (p-menu popup); no celular, bottom sheet com as mesmas ações. */
  abrirMenu(lista: ListaDto, evento: Event, menu: { toggle: (e: Event) => void }) {
    this.doMenu = lista;
    if (this.movel()) {
      this.acoesAbertas = true;
      return;
    }
    this.itensMenu = this.acoes(lista).map(a => ({
      label: a.rotulo, icon: a.icone, styleClass: a.perigo ? 'item-excluir' : undefined, command: () => a.executar(lista)
    }));
    menu.toggle(evento);
  }

  executarNoSheet(acao: AcaoPlanejamento) {
    this.acoesAbertas = false;
    if (this.doMenu) acao.executar(this.doMenu);
  }

  arquivar(lista: ListaDto) {
    this.listaService.arquivar(lista.id).subscribe({
      next: () => {
        this.avisarComDesfazer('Planejamento arquivado', `"${lista.nome}" foi para Arquivados.`, () => this.desarquivar(lista, false));
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao arquivar o planejamento.'))
    });
  }

  /** `avisar` = false no Desfazer do arquivar: não oferece desfazer o desfazer. */
  desarquivar(lista: ListaDto, avisar = true) {
    this.listaService.desarquivar(lista.id).subscribe({
      next: () => {
        if (avisar)
          this.avisarComDesfazer('Planejamento desarquivado', `"${lista.nome}" voltou para Meus planejamentos.`, () => this.arquivarSemAviso(lista));
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao desarquivar o planejamento.'))
    });
  }

  private arquivarSemAviso(lista: ListaDto) {
    this.listaService.arquivar(lista.id).subscribe({
      next: () => this.load(),
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao arquivar o planejamento.'))
    });
  }

  async excluir(lista: ListaDto) {
    const itens = lista.resumo?.itens ?? 0;
    const dosItens = itens === 0 ? '' : itens === 1 ? ' e o item dele' : ` e os ${itens} itens dele`;
    const ok = await this.confirmacao.confirmar(`Excluir o planejamento "${lista.nome}"${dosItens}? Não dá para desfazer.`,
      { titulo: 'Excluir planejamento' });
    if (!ok) return;

    this.listaService.excluir(lista.id).subscribe({
      next: () => {
        this.alertService.success('Planejamento excluído.');
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir o planejamento.'))
    });
  }

  duplicar(lista: ListaDto) {
    this.duplicando = lista;
  }

  /** A cópia entra em Meus planejamentos; o aviso oferece abrir. */
  aoDuplicar(copia: ListaDto) {
    this.duplicando = null;
    this.avisar('Planejamento duplicado', `"${copia.nome}" foi criado.`, {
      rotulo: 'Abrir', icone: 'pi pi-external-link', acao: () => this.abrir(copia),
      segundo: { rotulo: 'Ver comparação', icone: 'pi pi-chart-bar', acao: () => this.comparar(copia) }
    });
    this.load();
  }

  private avisarComDesfazer(titulo: string, texto: string, desfazer: () => void) {
    this.avisar(titulo, texto, { rotulo: 'Desfazer', icone: 'pi pi-undo', acao: desfazer });
  }

  private avisar(titulo: string, texto: string, botao: BotaoDoAviso) {
    this.mensagens.clear('planejamento');
    this.mensagens.add({ key: 'planejamento', severity: 'success', summary: titulo, detail: texto, life: 10000, data: botao });
  }

  acionarAviso(botao: BotaoDoAviso) {
    this.mensagens.clear('planejamento');
    botao.acao();
  }
}
