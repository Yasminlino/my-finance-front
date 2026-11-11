import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ModalComponent, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { NomesExtratoComponent } from './nomes-extrato/nomes-extrato.component';
import { Subject, catchError, debounceTime, firstValueFrom, of, switchMap } from 'rxjs';
import {
  CampoRegra, ExemploRegraDto, OperadorRegra, PreviaRegraResultadoDto, RegraClassificacaoDto, SugestaoRegraDto
} from 'src/app/core/models/regra-classificacao.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import {
  OPCOES_CAMPO, OPCOES_OPERADOR, Trecho, destacar, ignorar, inicioCurto, inicioDaFrase, lerIgnoradas, mover, normalizarTexto, usoDaRegra
} from './classificacao.regras';

type Opcao = { label: string; value: number };

/** O que está sendo preenchido: regra nova (id null) ou a editada. */
export type FormRegra = {
  id: number | null; texto: string; campo: CampoRegra; operador: OperadorRegra; bancoId: number | null;
  categoriaId: number | null; tipoMovimentacaoId: number | null; pessoaMovimentacaoId: number | null; ativa: boolean;
};

/** Regra nova já com alguns campos (sugestão, "Editar" do "Criar regra?"). */
export type RegraInicial = Partial<Omit<FormRegra, 'id'>>;

const VAZIA: Omit<FormRegra, 'id'> = {
  texto: '', campo: 'descricao_ou_pessoa', operador: 'contem', bancoId: null, categoriaId: null, tipoMovimentacaoId: null,
  pessoaMovimentacaoId: null, ativa: true
};

/**
 * Tela "Regras de classificação" (card #76, fase 1, layout novo de 05/11). A regra é montada como frase, com prévia
 * ao vivo dos lançamentos que batem e opção de aplicar nos que estão sem categoria; aviso de conflito; lista na ordem de
 * prioridade (arrastar ou Subir/Descer no ⋮), com uso e liga/desliga; "Sugestões do seu extrato". No celular vira tela
 * cheia com cards e a regra abre num painel de baixo.
 */
@Component({
  selector: 'app-modal-regras-classificacao',
  standalone: true,
  imports: [
    FormsModule, NgTemplateOutlet, PrimeTemplate, ButtonModule, CheckboxModule, DropdownModule, InputSwitchModule, ModalComponent, ModalRodapeDirective,
    InputTextModule, MenuModule, SelectButtonModule, SidebarModule, EmptyStateComponent, NomesExtratoComponent
  ],
  templateUrl: './modal-regras-classificacao.component.html',
  styleUrls: ['./modal-regras-classificacao.component.scss']
})
export class ModalRegrasClassificacaoComponent implements OnInit {
  @Input() categorias: Opcao[] = [];
  @Input() tipos: Opcao[] = [];
  @Input() pessoas: Opcao[] = [];
  @Input() contas: Opcao[] = [];
  /** Layout de celular (tela cheia, cards, painel de baixo). */
  @Input() movel = false;
  /** Abre já com uma regra nova preenchida. */
  @Input() inicial: RegraInicial | null = null;
  @Output() fechado = new EventEmitter<void>();
  /** Lançamentos ganharam categoria (ids): a tela recarrega e marca "acabou de ser classificado". */
  @Output() alterou = new EventEmitter<number[]>();
  /** A lista de regras mudou (a tela usa para não propor um texto que já tem regra). */
  @Output() regrasMudaram = new EventEmitter<RegraClassificacaoDto[]>();

  @ViewChild('menu') menu?: Menu;
  @ViewChild('nomes') nomes?: NomesExtratoComponent;

  /** Card #79: "Nomes e regras" — a aba dos nomes do extrato e a das regras. */
  readonly opcoesAba: { label: string; value: 'nomes' | 'regras' }[] = [
    { label: 'Nomes do extrato', value: 'nomes' }, { label: 'Regras', value: 'regras' }
  ];
  aba: 'nomes' | 'regras' = 'nomes';

  @ViewChild(ModalComponent) modal?: ModalComponent;

  /** Nomes classificados e não salvos: o mf-modal pergunta antes de fechar (card #80). */
  get temAlteracoes(): boolean {
    return this.aba === 'nomes' && !!this.nomes?.temAlteracoes;
  }

  /** "Fechar" do rodapé: passa pelo mf-modal, que pergunta se houver algo não salvo. */
  fechar(): Promise<void> {
    return this.modal ? this.modal.pedirParaFechar() : Promise.resolve(this.fechado.emit());
  }

  /** Nomes classificados: a lista de regras muda e a tela de trás recarrega os lançamentos. */
  aoSalvarNomes(_lancamentos: number): void {
    this.carregar();
    this.alterou.emit([]);
  }

  private readonly servico = inject(RegraClassificacaoService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly opcoesCampo = OPCOES_CAMPO;
  readonly opcoesOperador = OPCOES_OPERADOR;

  regras: RegraClassificacaoDto[] = [];
  sugestoes: SugestaoRegraDto[] = [];
  private ignoradas = new Set<string>();
  form: FormRegra | null = null;
  previa: PreviaRegraResultadoDto | null = null;
  carregandoPrevia = false;
  aplicarAgora = true;
  busca = '';
  loading = false;
  salvando = false;
  itensMenu: MenuItem[] = [];
  /** Id da regra sendo arrastada. */
  arrastando: number | null = null;

  private readonly previa$ = new Subject<FormRegra>();

  constructor() {
    this.previa$.pipe(
      debounceTime(300),
      switchMap(f => normalizarTexto(f.texto).length < 2
        ? of(null)
        : this.servico.previa({
          texto: f.texto, campo: f.campo, operador: f.operador, bancoId: f.bancoId, categoriaId: f.categoriaId
        }).pipe(catchError(() => of(null)))),
      takeUntilDestroyed()
    ).subscribe(p => {
      this.previa = p;
      this.carregandoPrevia = false;
    });
  }

  ngOnInit(): void {
    this.ignoradas = new Set(lerIgnoradas());
    this.carregar();
    this.carregarSugestoes();
    if (this.inicial) this.novaRegra(this.inicial);
  }

  // ---------- lista ----------

  get filtrando(): boolean {
    return normalizarTexto(this.busca).length > 0;
  }

  get regrasVisiveis(): RegraClassificacaoDto[] {
    const termo = normalizarTexto(this.busca);
    if (!termo) return this.regras;
    return this.regras.filter(r =>
      [r.texto, r.categoriaNome, r.pessoaNome, r.tipoMovimentacaoNome, r.bancoNome].some(t => normalizarTexto(t).includes(termo)));
  }

  inicio(r: RegraClassificacaoDto): { campo: string; operador: string } {
    return inicioDaFrase(r);
  }

  /** No card do celular o padrão ("a descrição ou a pessoa contém") não aparece: só o que foge dele. */
  inicioCurto(r: RegraClassificacaoDto): string {
    return inicioCurto(r);
  }

  uso(r: RegraClassificacaoDto): string {
    return usoDaRegra(r);
  }

  alternarAtiva(r: RegraClassificacaoDto, ativa: boolean): void {
    this.servico.atualizar({ ...r, ativa }).subscribe({
      next: () => this.carregar(),
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a regra.'));
        this.carregar();
      }
    });
  }

  abrirMenu(evento: Event, r: RegraClassificacaoDto): void {
    const i = this.regras.findIndex(x => x.id === r.id);
    this.itensMenu = [
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar(r) },
      { label: 'Duplicar', icon: 'pi pi-copy', command: () => this.duplicar(r) },
      { label: 'Aplicar de novo', icon: 'pi pi-replay', command: () => this.aplicarDeNovo(r) },
      { label: 'Subir', icon: 'pi pi-arrow-up', disabled: i <= 0 || this.filtrando, command: () => this.moverRegra(i, i - 1) },
      { label: 'Descer', icon: 'pi pi-arrow-down', disabled: i >= this.regras.length - 1 || this.filtrando, command: () => this.moverRegra(i, i + 1) },
      { separator: true },
      { label: 'Excluir', icon: 'pi pi-trash', styleClass: 'regra-menu-excluir', command: () => this.excluir(r) }
    ];
    this.menu?.toggle(evento);
  }

  async excluir(r: RegraClassificacaoDto): Promise<void> {
    const ok = await this.confirmacao.confirmar(`Excluir a regra "${r.texto}"? Os lançamentos já classificados não mudam.`,
      { titulo: 'Excluir regra' });
    if (!ok) return;
    this.servico.excluir(r.id).subscribe({
      next: () => {
        this.alertService.success('Regra excluída.');
        if (this.form?.id === r.id) this.form = null;
        this.carregar();
        this.carregarSugestoes();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir a regra.'))
    });
  }

  async aplicarDeNovo(r: RegraClassificacaoDto): Promise<void> {
    try {
      const resultado = await firstValueFrom(this.servico.aplicar(r.id));
      this.avisarAplicados(resultado.quantidade, resultado.itemIds);
      this.carregar();
    } catch (e) {
      this.alertService.error(extrairMensagemErro(e, 'Erro ao aplicar a regra.'));
    }
  }

  // ---------- ordem (vale a de cima) ----------

  moverRegra(de: number, para: number): void {
    const antes = this.regras;
    this.regras = mover(this.regras, de, para);
    if (this.regras !== antes && this.regras.some((r, i) => r.id !== antes[i]?.id)) this.salvarOrdem();
  }

  /** Arrastar pela alça (mouse ou dedo): troca de lugar ao passar por cima de outra regra; grava ao soltar. */
  iniciarArrasto(evento: PointerEvent, r: RegraClassificacaoDto): void {
    if (this.filtrando) return;
    evento.preventDefault();
    this.arrastando = r.id;
    const antes = this.regras.map(x => x.id).join(',');

    const aoMover = (e: PointerEvent) => {
      const alvo = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-regra-id]');
      const id = Number(alvo?.getAttribute('data-regra-id'));
      if (!id || id === this.arrastando) return;
      const de = this.regras.findIndex(x => x.id === this.arrastando);
      const para = this.regras.findIndex(x => x.id === id);
      this.regras = mover(this.regras, de, para);
    };
    const aoSoltar = () => {
      document.removeEventListener('pointermove', aoMover);
      document.removeEventListener('pointerup', aoSoltar);
      document.removeEventListener('pointercancel', aoSoltar);
      this.arrastando = null;
      if (this.regras.map(x => x.id).join(',') !== antes) this.salvarOrdem();
    };
    document.addEventListener('pointermove', aoMover);
    document.addEventListener('pointerup', aoSoltar);
    document.addEventListener('pointercancel', aoSoltar);
  }

  private salvarOrdem(): void {
    this.regrasMudaram.emit(this.regras);
    this.servico.reordenar(this.regras.map(r => r.id)).subscribe({
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a ordem das regras.'));
        this.carregar();
      }
    });
  }

  // ---------- formulário ----------

  novaRegra(inicial: RegraInicial = {}): void {
    this.form = { id: null, ...VAZIA, ...inicial, texto: inicial.texto ?? '' };
    this.aplicarAgora = true;
    this.aoMudarForm();
    this.mostrarFormulario();
  }

  editar(r: RegraClassificacaoDto): void {
    this.form = {
      id: r.id, texto: r.texto, campo: r.campo ?? 'descricao_ou_pessoa', operador: r.operador ?? 'contem', bancoId: r.bancoId ?? null,
      categoriaId: r.categoriaId ?? null, tipoMovimentacaoId: r.tipoMovimentacaoId ?? null,
      pessoaMovimentacaoId: r.pessoaMovimentacaoId ?? null, ativa: r.ativa
    };
    this.aplicarAgora = true;
    this.aoMudarForm();
    this.mostrarFormulario();
  }

  /** No desktop o formulário fica no topo da janela: quem clicou numa sugestão lá embaixo precisa ver que ele abriu. */
  private mostrarFormulario(): void {
    if (this.movel) return;
    setTimeout(() => this.host.nativeElement.querySelector('.regra-painel')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }));
  }

  duplicar(r: RegraClassificacaoDto): void {
    this.editar(r);
    if (this.form) this.form.id = null;
  }

  cancelar(): void {
    if (this.salvando) return;
    this.form = null;
    this.previa = null;
  }

  /** Qualquer campo da frase mudou: refaz a prévia (com espera curta enquanto digita). */
  aoMudarForm(): void {
    if (!this.form) return;
    this.carregandoPrevia = normalizarTexto(this.form.texto).length >= 2;
    if (!this.carregandoPrevia) this.previa = null;
    this.previa$.next({ ...this.form });
  }

  get podeSalvar(): boolean {
    const f = this.form;
    return !!f && normalizarTexto(f.texto).length >= 2 && !!(f.categoriaId || f.tipoMovimentacaoId || f.pessoaMovimentacaoId) && !this.salvando;
  }

  async salvar(): Promise<void> {
    const f = this.form;
    if (!f || !this.podeSalvar) return;
    const dados = {
      texto: f.texto.trim(), campo: f.campo, operador: f.operador, bancoId: f.bancoId, categoriaId: f.categoriaId,
      tipoMovimentacaoId: f.tipoMovimentacaoId, pessoaMovimentacaoId: f.pessoaMovimentacaoId, ativa: f.ativa
    };
    const aplicar = this.aplicarAgora && (this.previa?.semCategoria ?? 0) > 0;
    this.salvando = true;
    try {
      let id = f.id;
      if (id) {
        const atual = this.regras.find(r => r.id === id);
        await firstValueFrom(this.servico.atualizar({ ...atual, id, ...dados }));
      } else {
        id = (await firstValueFrom(this.servico.criar(dados))).id;
      }
      if (aplicar && id) {
        const resultado = await firstValueFrom(this.servico.aplicar(id));
        this.avisarAplicados(resultado.quantidade, resultado.itemIds, f.id ? 'Regra salva' : 'Regra criada');
      } else {
        this.alertService.success(f.id ? 'Regra salva.' : 'Regra criada.');
      }
      this.form = null;
      this.previa = null;
      this.carregar();
      this.carregarSugestoes();
    } catch (e) {
      this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a regra.'));
    } finally {
      this.salvando = false;
    }
  }

  // ---------- prévia ----------

  trechos(ex: ExemploRegraDto): Trecho[] {
    return destacar(ex.texto, this.form?.texto ?? '', this.form?.operador);
  }

  valor(ex: ExemploRegraDto): string {
    const saida = ex.tipoLancamento !== 'Entrada';
    return (saida ? '- ' : '+ ') + formatCurrencyBR(Math.abs(ex.valor));   // card #81: mesmo sinal do resto do app
  }

  dataCurta(iso: string): string {
    const [, m, d] = (iso ?? '').split('-');
    return d && m ? `${d}/${m}` : iso;
  }

  get conflito(): ExemploRegraDto | null {
    return this.form?.categoriaId ? this.previa?.exemplosConflito?.[0] ?? null : null;
  }

  // ---------- sugestões ----------

  get sugestoesVisiveis(): SugestaoRegraDto[] {
    return this.sugestoes.filter(s => !this.ignoradas.has(normalizarTexto(s.texto)));
  }

  ignorarSugestao(s: SugestaoRegraDto): void {
    this.ignoradas = new Set(ignorar(s.texto));
  }

  criarDaSugestao(s: SugestaoRegraDto): void {
    this.novaRegra({ texto: s.texto, categoriaId: s.categoriaId ?? null });
  }

  private carregarSugestoes(): void {
    this.servico.sugestoesDeRegra().subscribe({
      next: s => (this.sugestoes = Array.isArray(s) ? s : []),
      error: () => (this.sugestoes = [])
    });
  }

  // ---------- comum ----------

  private avisarAplicados(quantidade: number, ids: number[], prefixo?: string): void {
    const quantos = quantidade === 1 ? '1 lançamento classificado' : `${quantidade} lançamentos classificados`;
    this.alertService.success(prefixo ? `${prefixo}: ${quantos}.` : `${quantos[0].toUpperCase()}${quantos.slice(1)}.`);
    if (quantidade > 0) this.alterou.emit(ids ?? []);
  }

  private carregar(): void {
    this.loading = true;
    this.servico.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.loading = false;
        this.regras = Array.isArray(r) ? r : [];
        this.regrasMudaram.emit(this.regras);
      },
      error: e => {
        this.loading = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as regras.'));
      }
    });
  }
}
