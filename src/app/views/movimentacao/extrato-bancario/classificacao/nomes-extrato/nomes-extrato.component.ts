import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { forkJoin, finalize } from 'rxjs';
import { GrupoParecidosDto, NomeExtratoDto } from 'src/app/core/models/nomes-extrato.model';
import { NomesExtratoService } from 'src/app/core/services/nomes-extrato.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { JuntarParecidosComponent } from '../juntar-parecidos/juntar-parecidos.component';
import {
  ABAS_NOMES, AbaNomes, Classificacao, FiltroNomes, alteracoes, aplicarEmLote, atual, comCategoria, contagens, contexto,
  filtrarNomes, sugestaoVisivel
} from './nomes-extrato.regras';

type Opcao = { label: string; value: number };

/**
 * Card #79 — aba "Nomes do extrato" do "Nomes e regras": os nomes que vieram nos extratos ("CIRCUITO"), o que falta
 * classificar, a sugestão pelo histórico (✓), escolha em lote e "Juntar parecidos". Classificar cria a regra
 * "nome do extrato é igual a". Nada grava antes do Salvar. No celular, cartões e um painel de baixo.
 */
@Component({
  selector: 'app-nomes-extrato',
  standalone: true,
  imports: [
    FormsModule, PrimeTemplate, ButtonModule, CheckboxModule, DropdownModule, InputTextModule, SelectButtonModule, SidebarModule,
    TableModule, EmptyStateComponent, JuntarParecidosComponent
  ],
  templateUrl: './nomes-extrato.component.html',
  styleUrls: ['./nomes-extrato.component.scss']
})
export class NomesExtratoComponent implements OnInit {
  @Input() categorias: Opcao[] = [];
  @Input() tipos: Opcao[] = [];
  @Input() movel = false;
  /** Salvou (regras e talvez lançamentos mudaram): a tela de trás recarrega. */
  @Output() salvou = new EventEmitter<number>();

  private readonly servico = inject(NomesExtratoService);
  private readonly alert = inject(AlertService);

  nomes: NomeExtratoDto[] = [];
  grupos: GrupoParecidosDto[] = [];
  rascunho: Record<string, Classificacao> = {};
  filtro: FiltroNomes = { aba: 'classificar', busca: '', categoriaId: null };
  selecionados: NomeExtratoDto[] = [];
  lote: Classificacao = { categoriaId: null, tipoMovimentacaoId: null };
  aplicarAosImportados = true;
  loading = false;
  salvando = false;
  /** Celular: o nome aberto no painel de baixo. */
  emEdicao: NomeExtratoDto | null = null;
  edicao: Classificacao = { categoriaId: null, tipoMovimentacaoId: null };
  juntando = false;

  get opcoesAba(): { label: string; value: AbaNomes }[] {
    const c = contagens(this.nomes);
    return ABAS_NOMES.map(a => ({ ...a, label: `${a.label} (${c[a.value]})` }));
  }

  get visiveis(): NomeExtratoDto[] {
    return filtrarNomes(this.nomes, this.filtro, this.rascunho);
  }

  get pendentes() {
    return alteracoes(this.nomes, this.rascunho);
  }

  /** O modal pergunta antes de fechar com algo não salvo. */
  get temAlteracoes(): boolean {
    return this.pendentes.length > 0;
  }

  get gruposDivergentes(): number {
    return this.grupos.filter(g => g.divergem).length;
  }

  ngOnInit(): void {
    this.carregar(true);
  }

  agora(n: NomeExtratoDto): Classificacao {
    return atual(n, this.rascunho);
  }

  contexto(n: NomeExtratoDto): string {
    return contexto(n);
  }

  mudou(n: NomeExtratoDto): boolean {
    return this.pendentes.some(p => p.texto === n.texto);
  }

  mostraSugestao(n: NomeExtratoDto): boolean {
    return sugestaoVisivel(n, this.agora(n));
  }

  nomeCategoria(id: number | null | undefined): string {
    return this.categorias.find(c => c.value === id)?.label ?? '';
  }

  nomeTipo(id: number | null | undefined): string {
    return this.tipos.find(t => t.value === id)?.label ?? '';
  }

  escolherCategoria(n: NomeExtratoDto, categoriaId: number | null): void {
    this.rascunho = { ...this.rascunho, [n.texto]: comCategoria(n, this.agora(n), categoriaId) };
  }

  escolherTipo(n: NomeExtratoDto, tipoId: number | null): void {
    this.rascunho = { ...this.rascunho, [n.texto]: { ...this.agora(n), tipoMovimentacaoId: tipoId } };
  }

  aceitarSugestao(n: NomeExtratoDto): void {
    this.rascunho = {
      ...this.rascunho,
      [n.texto]: { categoriaId: n.sugestaoCategoriaId, tipoMovimentacaoId: this.agora(n).tipoMovimentacaoId ?? n.sugestaoTipoMovimentacaoId }
    };
  }

  /** Confirmar o "por semelhança" como está (vira regra "igual a"). */
  confirmarSemelhanca(n: NomeExtratoDto): void {
    this.rascunho = { ...this.rascunho, [n.texto]: { categoriaId: n.categoriaId, tipoMovimentacaoId: n.tipoMovimentacaoId } };
  }

  aplicarLote(): void {
    if (!this.selecionados.length || (this.lote.categoriaId == null && this.lote.tipoMovimentacaoId == null)) return;
    this.rascunho = aplicarEmLote(this.nomes, this.rascunho, this.selecionados.map(s => s.texto), this.lote);
    this.selecionados = [];
    this.lote = { categoriaId: null, tipoMovimentacaoId: null };
  }

  descartar(): void {
    this.rascunho = {};
    this.selecionados = [];
  }

  salvar(): void {
    const itens = this.pendentes;
    if (!itens.length || this.salvando) return;
    this.salvando = true;
    this.servico.classificar(itens, this.aplicarAosImportados)
      .pipe(finalize(() => (this.salvando = false)))
      .subscribe({
        next: r => {
          const lancamentos = r.lancamentos ? ` e ${r.lancamentos} ${r.lancamentos === 1 ? 'lançamento atualizado' : 'lançamentos atualizados'}` : '';
          this.alert.success(`${r.regras} ${r.regras === 1 ? 'nome classificado' : 'nomes classificados'}${lancamentos}.`);
          this.rascunho = {};
          this.selecionados = [];
          this.salvou.emit(r.lancamentos);
          this.carregar(false);
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Não foi possível salvar. Tente de novo.'))
      });
  }

  // ---------- celular ----------

  abrir(n: NomeExtratoDto): void {
    this.emEdicao = n;
    this.edicao = { ...this.agora(n) };
  }

  sugestaoVisivelNoPainel(n: NomeExtratoDto): boolean {
    return sugestaoVisivel(n, this.edicao);
  }

  editarCategoriaNoPainel(categoriaId: number | null): void {
    if (this.emEdicao) this.edicao = comCategoria(this.emEdicao, this.edicao, categoriaId);
  }

  confirmarPainel(): void {
    if (this.emEdicao) this.rascunho = { ...this.rascunho, [this.emEdicao.texto]: { ...this.edicao } };
    this.emEdicao = null;
  }

  // ---------- juntar parecidos ----------

  aoJuntar(juntou: number): void {
    this.juntando = false;
    if (juntou > 0) {
      this.salvou.emit(0);
      this.carregar(false);
    }
  }

  private carregar(primeira: boolean): void {
    this.loading = true;
    forkJoin({ nomes: this.servico.listar(), grupos: this.servico.grupos() })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ nomes, grupos }) => {
          this.nomes = nomes;
          this.grupos = grupos;
          // Abre em "Para classificar" quando há o que classificar; senão em "Todos".
          if (primeira && !contagens(nomes).classificar) this.filtro = { ...this.filtro, aba: 'todos' };
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Erro ao carregar os nomes do extrato.'))
      });
  }
}
