import { Component, DestroyRef, HostListener, Input, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';
import { ListaService } from '../../../services/lista.service';
import { AuthService } from '../../../services/auth.service';
import { VencidasService } from '../../../services/vencidas.service';
import { NotificacoesService } from '../../../services/notificacoes.service';
import { ChaveCriar, CriarContextoService } from '../../../services/criar-contexto.service';

/** Um atalho do grid "Outros" do painel Novo. */
type AtalhoCriar = { chave: ChaveCriar; titulo: string; icone: string; cor: string; url: string };
/** O destaque do topo do painel Novo: a ação da tela (ou as duas da Home). */
type DestaqueCriar = { titulo: string; subtitulo?: string; icone: string; cor: string; dessaTela: boolean; executar: () => void };

/** icon: classe do PrimeIcons ("pi pi-..."). */
export type NavItem = { path: string; label: string; icon: string; descricao?: string };

/** Abaixo disto, gaveta (tablet); abaixo de 768px, barras do celular (card #72). */
const LARGURA_DESKTOP = 992;
const LARGURA_CELULAR = 768;

/**
 * Navegação do app (card #72): barra superior no desktop, gaveta à esquerda no tablet e, no celular,
 * barra fina em cima e barra fixa embaixo (Início · Contas · + · Extrato · Mais). Busca rápida no Ctrl+K.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() brand = 'My Finance';

  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly vencidasService = inject(VencidasService);
  private readonly listaService = inject(ListaService);
  private readonly destroyRef = inject(DestroyRef);

  usuario = localStorage.getItem('usuarioNome') ?? 'Admin';
  readonly vencidas = this.vencidasService.quantidade;
  private readonly notificacoes = inject(NotificacoesService);
  /** Card #73: avisos novos no sino. */
  readonly avisosNovos = this.notificacoes.novos;
  readonly rotuloSino = computed(() => this.avisosNovos() ? `Notificações: ${this.avisosNovos()} novas` : 'Notificações');
  @ViewChild('painelAvisos') painelAvisos?: OverlayPanel;
  /** Celular: o sino abre em tela cheia. */
  avisosAbertos = false;

  private readonly largura = signal(window.innerWidth);
  readonly desktop = computed(() => this.largura() >= LARGURA_DESKTOP);
  readonly celular = computed(() => this.largura() < LARGURA_CELULAR);
  readonly tablet = computed(() => !this.desktop() && !this.celular());
  /** Card #78: no celular a barra do topo (busca e avatar) fica só no Início. */
  readonly mostrarTopo = computed(() => !this.celular() || ['/home', '/'].includes(this.url().split('?')[0]));
  private readonly url = signal(this.router.url ?? '');

  readonly diaADia: NavItem[] = [
    { path: '/home', label: 'Início', icon: 'pi pi-home' },
    { path: '/contas-a-pagar', label: 'Contas a pagar', icon: 'pi pi-money-bill' },
    { path: '/extrato-bancario/resumo', label: 'Extratos', icon: 'pi pi-wallet' }
  ];

  readonly cadastrosDoDia: NavItem[] = [
    { path: '/contas', label: 'Contas fixas', icon: 'pi pi-credit-card', descricao: 'Modelos que geram as contas a pagar de cada mês' },
    { path: '/categorias', label: 'Categorias', icon: 'pi pi-tags', descricao: 'Para classificar contas e lançamentos' }
  ];

  readonly configuracoes: NavItem[] = [
    { path: '/bancos', label: 'Bancos', icon: 'pi pi-building', descricao: 'Contas e cartões, fechamento e quem usa' },
    { path: '/tipos-cartao', label: 'Tipos de cartão', icon: 'pi pi-id-card', descricao: 'Crédito, débito, conta corrente…' },
    { path: '/tipos-movimentacao', label: 'Tipos de movimentação', icon: 'pi pi-sync', descricao: 'Como o dinheiro entrou ou saiu' }
  ];

  readonly planejamento: NavItem[] = [
    { path: '/planejamento', label: 'Meus planejamentos', icon: 'pi pi-clipboard' },
    { path: '/planejamento/arquivados', label: 'Arquivados', icon: 'pi pi-inbox' }
  ];

  private readonly criarContexto = inject(CriarContextoService);

  /** Grid "Outros" do painel Novo (protótipo do card #72), na ordem; a ação da tela não se repete aqui. */
  readonly atalhosCriar: AtalhoCriar[] = [
    { chave: 'conta-a-pagar', titulo: 'Conta a pagar', icone: 'pi pi-money-bill', cor: 'laranja', url: '/contas-a-pagar?novo=1' },
    { chave: 'lancamento', titulo: 'Lançamento no extrato', icone: 'pi pi-arrow-right-arrow-left', cor: 'azul', url: '/extrato-bancario?lancar=1' },
    { chave: 'importar', titulo: 'Importar extrato', icone: 'pi pi-upload', cor: 'azul', url: '/extrato-bancario/resumo?importar=1' },
    { chave: 'item', titulo: 'Item em lista', icone: 'pi pi-check-square', cor: 'verde', url: '/planejamento' },
    { chave: 'compromisso', titulo: 'Compromisso', icone: 'pi pi-calendar', cor: 'roxo', url: '/planejamento?filtro=DATA' },
    { chave: 'planejamento', titulo: 'Nova lista', icone: 'pi pi-list', cor: 'vermelho', url: '/planejamento?novo=1' },
    { chave: 'categoria', titulo: 'Categoria', icone: 'pi pi-tag', cor: 'amarelo', url: '/categorias?novo=1' }
  ];

  /** Topo do painel: a ação desta tela; sem ela (Home), Conta a pagar e Lançamento no extrato. */
  get destaquesCriar(): DestaqueCriar[] {
    const acao = this.criarContexto.acao();
    if (acao) {
      return [{ titulo: acao.titulo(), subtitulo: acao.subtitulo?.(), icone: acao.icone, cor: acao.cor, dessaTela: true,
        executar: () => this.executarCriar(() => acao.executar()) }];
    }
    return this.atalhosCriar.filter(a => a.chave === 'conta-a-pagar' || a.chave === 'lancamento')
      .map(a => ({ titulo: a.titulo, icone: a.icone, cor: a.cor, dessaTela: false, executar: () => this.ir(a.url) }));
  }

  /** Grid 3×2 sem repetir o que já está no topo. */
  get outrosCriar(): AtalhoCriar[] {
    const acao = this.criarContexto.acao();
    const emOutraConta = acao?.chave === 'lancamento' && !!acao.emOutraConta?.();
    return this.atalhosCriar
      .filter(a => acao ? a.chave !== acao.chave || emOutraConta : a.chave !== 'conta-a-pagar' && a.chave !== 'lancamento')
      .map(a => (a.chave === 'lancamento' && emOutraConta ? { ...a, titulo: 'Lançamento em outra conta' } : a))
      .slice(0, 6);
  }

  abrirOutro(atalho: AtalhoCriar): void {
    const local = this.criarContexto.acao()?.locais?.[atalho.chave];
    if (local) this.executarCriar(local);
    else this.ir(atalho.url);
  }

  private executarCriar(acao: () => void): void {
    this.fecharPaineis();
    acao();
  }

  /** Lista aberta (/planejamento/:id) não tem barra: o botão de adicionar é dela (protótipo, exceção D). */
  readonly mostrarBarra = computed(() => this.celular() && !!this.auth.token && !/^\/planejamento\/\d+/.test(this.url().split('?')[0]));

  /** Planejamento ▾: as duas telas e os 3 mais recentes. */
  menuPlanejamento: MenuItem[] = this.montarMenuPlanejamento([]);
  readonly menuUsuario: MenuItem[] = [
    { label: 'Preferências', icon: 'pi pi-cog', command: () => this.ir('/preferencias') },
    { separator: true },
    { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.logout() }
  ];

  gavetaAberta = false;
  /** Gaveta do tablet: Cadastros recolhível; abre já aberto quando a tela atual é um cadastro. */
  cadastrosAbertos = false;

  /**
   * "Mais" do celular com os textos do protótipo (pedido dela). Agenda e Comparar só existem dentro de cada
   * planejamento: abrem a lista já no filtro de quem tem data / valor.
   */
  readonly planejamentoMais: (NavItem & { cor: string })[] = [
    { path: '/planejamento', label: 'Minhas listas', icon: 'pi pi-list', cor: 'verde' },
    { path: '/planejamento?filtro=DATA', label: 'Agenda', icon: 'pi pi-calendar', cor: 'roxo' },
    { path: '/planejamento?filtro=VALOR', label: 'Comparar', icon: 'pi pi-chart-bar', cor: 'azul' },
    { path: '/planejamento/arquivados', label: 'Arquivadas', icon: 'pi pi-inbox', cor: 'amarelo' }
  ];
  readonly cadastrosMais: NavItem[] = [
    { path: '/contas', label: 'Cadastro de Contas', icon: 'pi pi-money-bill' },
    { path: '/categorias', label: 'Categorias', icon: 'pi pi-tag' }
  ];
  /** "Bancos, cartões e tipos" abre e fecha no próprio "Mais", com as três telas. */
  configuracoesAbertas = false;

  /** Títulos do topo no celular (protótipo do card #72): o nome da tela atual no lugar do logo. */
  private readonly titulos: [string, string][] = [
    ['/contas-a-pagar', 'Contas a pagar'], ['/extrato-bancario', 'Extrato'], ['/planejamento', 'Planejamento'],
    ['/contas', 'Contas fixas'], ['/categorias', 'Categorias'], ['/bancos', 'Bancos'], ['/tipos-cartao', 'Tipos de cartão'],
    ['/tipos-movimentacao', 'Tipos de movimentação']
  ];
  criarAberto = false;
  maisAberto = false;
  buscaAberta = false;
  tecladoAberto = false;

  constructor() {
    // As páginas ganham espaço embaixo (e os botões flutuantes sobem) enquanto a barra inferior existe.
    effect(() => document.body.classList.toggle('mf-com-barra-inferior', this.mostrarBarra()));
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        this.url.set(e.urlAfterRedirects);
        this.fecharPaineis();
        if (this.auth.token) {
          this.vencidasService.atualizar();
          this.notificacoes.atualizar();
        }
      });
    if (this.auth.token) {
      this.vencidasService.atualizar();
      this.notificacoes.atualizar();
      this.listaService.listar().subscribe({
        next: listas => (this.menuPlanejamento = this.montarMenuPlanejamento(
          [...(listas ?? [])].sort((a, b) => b.id - a.id).slice(0, 3).map(l => ({ id: l.id, nome: l.nome })))),
        error: () => { /* sem recentes */ }
      });
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('mf-com-barra-inferior', 'mf-teclado-aberto');
  }

  /** Duas iniciais, como no protótipo ("Yasmin Lino" → "YL"). */
  get inicial(): string {
    const partes = this.usuario.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return ((partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  get tituloAtual(): string {
    const atual = this.url().split('?')[0];
    return this.titulos.find(([raiz]) => atual === raiz || atual.startsWith(raiz + '/'))?.[1] ?? 'Início';
  }

  /** Cores dos atalhos das folhas, na ordem. */
  corDoAtalho(i: number): string {
    return ['verde', 'roxo', 'azul', 'laranja'][i % 4];
  }

  abrirGaveta(): void {
    this.cadastrosAbertos = this.grupoAtivo(this.cadastrosDoDia) || this.grupoAtivo(this.configuracoes);
    this.gavetaAberta = true;
  }

  /** Item ativo pelo começo da URL (o Extrato vale para a listagem e o detalhe). */
  ativo(caminho: string): boolean {
    const atual = this.url().split('?')[0];
    if (caminho === '/home') return atual === '/home' || atual === '/';
    const raiz = caminho.startsWith('/extrato-bancario') ? '/extrato-bancario' : caminho.split('?')[0];
    return atual === raiz || atual.startsWith(raiz + '/');
  }

  grupoAtivo(itens: NavItem[]): boolean {
    return itens.some(i => this.ativo(i.path));
  }

  ir(caminho: string): void {
    this.fecharPaineis();
    this.router.navigateByUrl(caminho);
  }

  /** Sino: painel no desktop/tablet; tela cheia no celular. */
  abrirAvisos(evento: Event): void {
    if (this.celular()) {
      this.fecharPaineis();
      this.avisosAbertos = true;
    } else {
      this.painelAvisos?.toggle(evento);
    }
  }

  abrirBusca(): void {
    this.fecharPaineis();
    this.buscaAberta = true;
  }

  logout(): void {
    this.fecharPaineis();
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  @HostListener('window:resize')
  aoRedimensionar(): void {
    this.largura.set(window.innerWidth);
  }

  /** Ctrl+K (ou ⌘K) abre a busca de qualquer tela. */
  @HostListener('document:keydown', ['$event'])
  atalho(evento: KeyboardEvent): void {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k' && this.auth.token) {
      evento.preventDefault();
      this.abrirBusca();
    }
  }

  /** Celular: a barra inferior some enquanto o teclado está aberto (foco num campo de texto). */
  @HostListener('document:focusin', ['$event'])
  aoFocar(evento: FocusEvent): void {
    this.tecladoAberto = this.celular() && ehCampoDeTexto(evento.target);
    document.body.classList.toggle('mf-teclado-aberto', this.tecladoAberto);
  }

  @HostListener('document:focusout')
  aoDesfocar(): void {
    this.tecladoAberto = false;
    document.body.classList.remove('mf-teclado-aberto');
  }

  private fecharPaineis(): void {
    this.gavetaAberta = this.criarAberto = this.maisAberto = this.configuracoesAbertas = false;
    // No spec com NO_ERRORS_SCHEMA a referência não é o OverlayPanel de verdade.
    if (typeof this.painelAvisos?.hide === 'function') this.painelAvisos.hide();
  }

  private montarMenuPlanejamento(recentes: { id: number; nome: string }[]): MenuItem[] {
    return [
      ...this.planejamento.map(p => ({ label: p.label, icon: p.icon, command: () => this.ir(p.path) })),
      ...(recentes.length ? [{ separator: true }, { label: 'Recentes', disabled: true, styleClass: 'topo-menu-titulo' }] : []),
      ...recentes.map(r => ({ label: r.nome, icon: 'pi pi-angle-right', command: () => this.ir(`/planejamento/${r.id}`) }))
    ];
  }
}

function ehCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.isContentEditable || alvo.tagName === 'TEXTAREA') return true;
  return alvo.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file'].includes((alvo as HTMLInputElement).type);
}
