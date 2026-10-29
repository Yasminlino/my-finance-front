import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { combineLatest, finalize, forkJoin } from 'rxjs';
import { ComparacaoListasDto, ItemComparadoDto, LadoItemComparadoDto, ListaDto } from 'src/app/core/models/lista.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import {
  BarraCascata, FiltroComparacao, GrupoCascata, barrasDaCascata, contarFiltros, csvDaComparacao, filtrarComparacao,
  itensDoGrupo, percentualComSinal, tagsDoItem
} from '../comparar.regras';

type Base = 'estimado' | 'ok';

/** Mensagens da API ditas com "lista"; na tela é "planejamento". */
const SEM_ANTERIOR = 'Não há lista anterior na série.';
const MENSAGENS: Record<string, string> = {
  'Escolha outra lista para comparar.': 'Escolha outro planejamento para comparar.',
  'As listas não são da mesma série.': 'Os planejamentos não são da mesma série.',
  [SEM_ANTERIOR]: 'Não há planejamento anterior na série.'
};

/** Altura útil da cascata no SVG (o resto é para os rótulos). */
const ALTURA_BARRAS = 200;

/**
 * Comparar dois planejamentos da mesma série (card #68): resumo, a cascata "o que explica a diferença",
 * destaques e item a item. Os números vêm prontos da API (GET /listas/{id}/comparar).
 */
@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [
    FormsModule, BadgeModule, ButtonModule, DropdownModule, IconFieldModule, InputIconModule, InputTextModule, SelectButtonModule,
    SkeletonModule, EmptyStateComponent, FilterBarComponent, PageHeaderComponent, StatCardComponent
  ],
  templateUrl: './comparar.component.html',
  styleUrls: ['./comparar.component.scss']
})
export class CompararComponent implements OnInit {
  private readonly listaService = inject(ListaService);
  private readonly alertService = inject(AlertService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly movel = inject(LarguraTelaService).movel;

  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };
  breadcrumb: MenuItem[] = [{ label: 'Planejamento' }, { label: 'Comparar' }];

  readonly opcoesBase: { label: string; value: Base }[] = [
    { label: 'Valor estimado', value: 'estimado' },
    { label: 'Só itens ok', value: 'ok' }
  ];

  id = 0;
  com: number | null = null;
  base: Base = 'estimado';

  loading = false;
  lista: ListaDto | null = null;
  serie: ListaDto[] = [];
  comparacao: ComparacaoListasDto | null = null;
  /** A API respondeu que não há anterior na série: a tela oferece ligar a outro planejamento. */
  semAnterior = false;
  /** Para "Ligar a outro planejamento": os de fora da série. */
  candidatos: ListaDto[] = [];
  ligarCom: number | null = null;

  barras: BarraCascata[] = [];
  barraAtiva: BarraCascata | null = null;
  filtro: FiltroComparacao = 'MUDANCA';
  busca = '';
  opcoesFiltro: { label: string; value: FiltroComparacao; contagem: number }[] = [];
  exibidos: ItemComparadoDto[] = [];

  get opcoesSerie(): { label: string; value: number }[] {
    return this.serie.map(l => ({ label: l.nome + (l.arquivadaEm ? ' (arquivado)' : ''), value: l.id }));
  }

  /** Escala da cascata: do menor ao maior ponto das barras (o zero sempre entra). */
  private get escala(): { min: number; max: number } {
    const pontos = this.barras.flatMap(b => [b.inicio, b.fim]);
    return { min: Math.min(0, ...pontos), max: Math.max(0, ...pontos) };
  }

  ngOnInit(): void {
    combineLatest([this.rota.paramMap, this.rota.queryParamMap]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([p, q]) => {
      this.id = Number(p.get('id'));
      const com = Number(q.get('com'));
      this.com = com > 0 ? com : null;
      this.base = q.get('base') === 'ok' ? 'ok' : 'estimado';
      this.carregar();
    });
  }

  carregar() {
    this.loading = true;
    this.semAnterior = false;
    forkJoin({ lista: this.listaService.obterPorId(this.id), serie: this.listaService.serie(this.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lista, serie }) => {
          this.lista = lista;
          this.serie = serie;
          this.breadcrumb = [
            { label: 'Planejamento' }, { label: 'Meus planejamentos', routerLink: '/planejamento' },
            { label: lista.nome, routerLink: ['/planejamento', String(lista.id)] }, { label: 'Comparar' }
          ];
          this.comparar();
        },
        error: e => {
          this.loading = false;
          if (e?.status === 404) {
            this.alertService.error('Planejamento não encontrado.');
            this.router.navigate(['/planejamento']);
            return;
          }
          this.alertService.error(this.mensagem(e, 'Erro ao carregar a comparação.'));
        }
      });
  }

  private comparar() {
    this.listaService.comparar(this.id, this.com ?? undefined, this.base)
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this.comparacao = c;
          this.com = c.anterior.id;
          this.barras = barrasDaCascata(c);
          this.aplicar();
        },
        error: e => {
          this.comparacao = null;
          if (extrairMensagemErro(e, '') === SEM_ANTERIOR) {
            this.semAnterior = true;
            this.carregarCandidatos();
            return;
          }
          this.alertService.error(this.mensagem(e, 'Erro ao comparar.'));
        }
      });
  }

  /** Mensagem da API sem "lista" na tela. */
  private mensagem(e: unknown, padrao: string): string {
    const texto = extrairMensagemErro(e, padrao);
    return MENSAGENS[texto] ?? texto;
  }

  aplicar() {
    if (!this.comparacao) return;
    const contagem = contarFiltros(this.comparacao.itens);
    const rotulos: Record<FiltroComparacao, string> = {
      MUDANCA: 'Com mudança', SUBIU: 'Subiu', CAIU: 'Caiu', NOVOS: 'Novos', SAIRAM: 'Saíram', TODOS: 'Todos'
    };
    this.opcoesFiltro = (Object.keys(rotulos) as FiltroComparacao[]).map(f => ({ label: rotulos[f], value: f, contagem: contagem[f] }));
    this.exibidos = filtrarComparacao(this.comparacao.itens, this.filtro, this.busca);
  }

  // ---- seletores (vão para a URL) ----

  trocarAtual(id: number) {
    this.router.navigate(['/planejamento', String(id), 'comparar'], { queryParams: { com: this.com === id ? null : this.com, base: this.base } });
  }

  trocarAnterior(com: number) {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { com, base: this.base }, queryParamsHandling: 'merge' });
  }

  trocarBase() {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { base: this.base }, queryParamsHandling: 'merge' });
  }

  voltar() {
    this.router.navigate(['/planejamento', String(this.id)]);
  }

  // ---- série montada à mão ----

  private carregarCandidatos() {
    forkJoin([this.listaService.listar(false), this.listaService.listar(true)]).subscribe({
      next: ([emUso, arquivados]) => {
        const naSerie = new Set(this.serie.map(l => l.id));
        this.candidatos = [...emUso, ...arquivados].filter(l => !naSerie.has(l.id) && l.id !== this.id)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      }
    });
  }

  ligarSerie() {
    if (!this.ligarCom) return;
    this.listaService.definirSerie(this.id, this.ligarCom).subscribe({
      next: () => {
        this.alertService.success('Planejamentos ligados na mesma série.');
        this.router.navigate([], { relativeTo: this.rota, queryParams: { com: this.ligarCom, base: this.base } });
      },
      error: e => this.alertService.error(this.mensagem(e, 'Erro ao ligar os planejamentos.'))
    });
  }

  async sairDaSerie() {
    const ok = await this.confirmacao.confirmar(
      `"${this.lista?.nome}" sai da série e deixa de ser comparado com os outros. Os itens não mudam.`,
      { titulo: 'Sair da série', aceitar: 'Sair da série' });
    if (!ok) return;
    this.listaService.definirSerie(this.id, null).subscribe({
      next: () => {
        this.alertService.success('Planejamento fora da série.');
        this.router.navigate([], { relativeTo: this.rota, queryParams: { com: null, base: this.base } });
      },
      error: e => this.alertService.error(this.mensagem(e, 'Erro ao sair da série.'))
    });
  }

  // ---- exibição ----

  moeda(valor: number | null | undefined): string {
    return formatCurrencyBR(valor ?? 0);
  }

  /** "+R$ 4,00" / "−R$ 1,00": sinal no texto. */
  moedaComSinal(valor: number): string {
    if (valor > 0) return '+' + this.moeda(valor);
    if (valor < 0) return '−' + this.moeda(-valor);
    return this.moeda(0);
  }

  percentual(p: number | null | undefined): string {
    return percentualComSinal(p);
  }

  lado(l: LadoItemComparadoDto | null | undefined): string {
    if (!l) return '—';
    if (l.total == null) return 'sem valor';
    return l.quantidade && l.quantidade > 1 ? `${l.quantidade} × ${this.moeda(l.valor)}` : this.moeda(l.total);
  }

  tags(item: ItemComparadoDto) {
    return tagsDoItem(item);
  }

  get novos(): number {
    return this.comparacao?.itens.filter(i => i.mudancas.includes('NOVO')).length ?? 0;
  }

  get sairam(): number {
    return this.comparacao?.itens.filter(i => i.mudancas.includes('SAIU')).length ?? 0;
  }

  // ---- cascata (SVG) ----

  /** Posição vertical (no SVG) de um valor: o maior fica em cima. */
  y(valor: number): number {
    const { min, max } = this.escala;
    const faixa = max - min || 1;
    return 10 + ((max - valor) / faixa) * ALTURA_BARRAS;
  }

  alturaBarra(b: BarraCascata): number {
    return Math.max(2, Math.abs(this.y(b.inicio) - this.y(b.fim)));
  }

  topoBarra(b: BarraCascata): number {
    return Math.min(this.y(b.inicio), this.y(b.fim));
  }

  /** Celular: barras horizontais a partir do zero, proporcionais ao maior efeito. */
  larguraEfeito(b: BarraCascata): number {
    const maior = Math.max(...this.barras.filter(x => x.tipo !== 'total').map(x => Math.abs(x.valor)), 0.01);
    return Math.round((Math.abs(b.valor) / maior) * 100);
  }

  get efeitos(): BarraCascata[] {
    return this.barras.filter(b => b.tipo !== 'total');
  }

  itensDaBarra(b: BarraCascata): ItemComparadoDto[] {
    if (!this.comparacao || b.tipo === 'total') return [];
    return itensDoGrupo(this.comparacao.itens, b.chave as GrupoCascata);
  }

  // ---- exportar ----

  exportarCsv() {
    if (!this.comparacao) return;
    const csv = csvDaComparacao(this.comparacao, this.exibidos);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparacao-${this.nomeDeArquivo(this.comparacao.anterior.nome)}-x-${this.nomeDeArquivo(this.comparacao.atual.nome)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** PDF pela impressão do navegador ("Salvar como PDF"); o CSS de impressão esconde menu e botões. */
  imprimir() {
    window.print();
  }

  private nomeDeArquivo(nome: string): string {
    return nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'planejamento';
  }
}
