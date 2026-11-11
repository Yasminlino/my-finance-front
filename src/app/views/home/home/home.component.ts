import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ContaMensal, LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { OcorrenciaDto } from 'src/app/core/models/lista.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { VencidasService } from 'src/app/core/services/vencidas.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR, formatDateInput, formatYearMonth, isoDate } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { statusAoPagar, vencimentoDe } from '../../movimentacao/contas-a-pagar/contas-a-pagar.regras';
import { ContasDoDia, contasDoDia, saudacao } from '../home.regras';

/** Painel "Contas vencidas" recolhido; lembrado neste navegador. */
const CHAVE_VENCIDAS_RECOLHIDAS = 'homeVencidasRecolhidas';

/** Estado de um bloco: cada um carrega sozinho e um erro não derruba o outro. */
type Bloco<T> = { carregando: boolean; erro: boolean; dados: T | null };
const vazio = <T>(): Bloco<T> => ({ carregando: true, erro: false, dados: null });

/**
 * Home (card #71): só o que é do dia — contas vencidas, contas de hoje e amanhã com Pagar, e a agenda de hoje.
 * Os números do mês ficam nas telas de origem (decisão dela em 11/11).
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly contaMensalService = inject(ContaMensalService);
  private readonly itemListaService = inject(ItemListaService);
  private readonly vencidasService = inject(VencidasService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly movel = inject(LarguraTelaService).movel;

  readonly usuario = lerLocal('usuarioNome') ?? '';
  readonly saudacao = `${saudacao(new Date())}${this.primeiroNome ? ', ' + this.primeiroNome : ''}`;
  readonly hojePorExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  readonly breadcrumb: MenuItem[] = [{ label: 'Início' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  /** + do celular: os atalhos que no desktop são botões. */
  readonly atalhos: MenuItem[] = [
    { label: 'Conta a pagar', icon: 'pi pi-plus', command: () => this.irPara('/contas-a-pagar', { novo: 1 }) },
    { label: 'Lançamento', icon: 'pi pi-plus', command: () => this.irPara('/extrato-bancario', { lancar: 1 }) },
    { label: 'Planejamento', icon: 'pi pi-list-check', command: () => this.irPara('/planejamento') }
  ];

  vencidasRecolhidas = lerLocal(CHAVE_VENCIDAS_RECOLHIDAS) === 'true';
  pagandoId: number | null = null;

  contas: Bloco<ContasDoDia> = vazio();
  agenda: Bloco<OcorrenciaDto[]> = vazio();

  get primeiroNome(): string {
    return (this.usuario ?? '').trim().split(/\s+/)[0] ?? '';
  }

  get vencidas(): ContaMensal[] {
    return this.vencidasService.contas();
  }

  get totalVencido(): number {
    return this.vencidas.reduce((s, c) => s + Number(c.valor || 0), 0);
  }

  /** Nada vencido, nada para hoje/amanhã e agenda vazia. */
  get diaLivre(): boolean {
    return !this.vencidas.length && !!this.contas.dados && !this.contas.dados.hoje.length && !this.contas.dados.amanha.length
      && !!this.agenda.dados && !this.agenda.dados.length;
  }

  ngOnInit(): void {
    this.vencidasService.atualizar();
    this.carregarContas();
    this.carregarAgenda();
  }

  // ---------- carga ----------

  /** Hoje e amanhã: o mês atual e, na virada, o seguinte. */
  carregarContas(): void {
    const hoje = new Date();
    const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const meses = [...new Set([formatYearMonth(hoje), formatYearMonth(amanha)])];
    this.carregar('contas', forkJoin(meses.map(m => this.contaMensalService.listarDoMes(m, false))).pipe(
      map(listas => contasDoDia(listas.flat(), hoje))));
  }

  carregarAgenda(): void {
    this.carregar('agenda', this.itemListaService.agendaPeriodo(isoDate(), isoDate()));
  }

  private carregar<K extends 'contas' | 'agenda'>(bloco: K, busca$: Observable<NonNullable<HomeComponent[K]['dados']>>): void {
    (this[bloco] as Bloco<unknown>) = { carregando: true, erro: false, dados: (this[bloco] as Bloco<unknown>).dados };
    busca$.pipe(
      map(dados => ({ carregando: false, erro: false, dados }) as Bloco<unknown>),
      catchError(() => of({ carregando: false, erro: true, dados: null } as Bloco<unknown>)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(estado => ((this[bloco] as Bloco<unknown>) = estado));
  }

  // ---------- ações ----------

  /** Mesma regra de Contas a Pagar: no prazo até o dia do vencimento; atualiza a tela sem recarregar. */
  pagar(conta: LinhaContasMensais): void {
    if (this.pagandoId) return;
    this.pagandoId = conta.id;
    this.contaMensalService.atualizar({ ...conta, situacao: statusAoPagar(vencimentoDe(conta), new Date()) }).subscribe({
      next: () => {
        this.pagandoId = null;
        this.alert.success(`${conta.nome} paga.`);
        this.vencidasService.atualizar();
        this.carregarContas();
      },
      error: e => {
        this.pagandoId = null;
        this.alert.error(extrairMensagemErro(e, 'Não foi possível marcar como paga.'));
      }
    });
  }

  marcarAgenda(o: OcorrenciaDto): void {
    if (!o.listaId) return;
    const feito = !o.feito;
    const pedido$ = o.repete
      ? this.itemListaService.alterarOcorrencia(o.listaId, o.itemId, o.dataOriginal, { feito })
      : this.itemListaService.marcarFeito(o.listaId, [o.itemId], feito);
    o.feito = feito;
    pedido$.subscribe({ error: e => { o.feito = !feito; this.alert.error(extrairMensagemErro(e, 'Não foi possível marcar o item.')); } });
  }

  alternarVencidas(): void {
    this.vencidasRecolhidas = !this.vencidasRecolhidas;
    gravarLocal(CHAVE_VENCIDAS_RECOLHIDAS, String(this.vencidasRecolhidas));
  }

  /** Contas a Pagar aberto no mês da data (como a Home antiga). */
  verContas(data?: unknown): void {
    this.router.navigate(['/contas-a-pagar'], { queryParams: { date: formatDateInput(data) || isoDate() } });
  }

  irPara(url: string, queryParams?: Record<string, unknown>): void {
    this.router.navigate([url], { queryParams });
  }

  // ---------- exibição ----------

  money(v: unknown): string {
    return formatCurrencyBR(v);
  }

  diaMes(data: unknown): string {
    const d = vencimentoDe({ data });
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  hora(h?: string | null): string {
    return h ? h.slice(0, 5) : 'dia todo';
  }
}

function lerLocal(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}

function gravarLocal(chave: string, valor: string): void {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}
