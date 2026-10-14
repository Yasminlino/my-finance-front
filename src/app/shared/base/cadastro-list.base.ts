import { DestroyRef, Directive, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, of, switchMap } from 'rxjs';
import { ExclusaoEmLoteService, RotuloEntidade } from 'src/app/core/services/exclusao-em-lote.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';

/**
 * Base das telas de lista de `views/cadastro/` (FE-P1-02): carga, ordenação,
 * modal de criar/editar e exclusão unitária e em lote.
 *
 * Cada tela declara só o que muda: `rotulo`, `buscar()`, `excluirRegistro()`,
 * `nomeDe()` e, se precisar de catálogos antes da primeira carga, `antesDeCarregar()`.
 * O template continua com `#grid`, `[dataSource]="registrosExibidos"` e os eventos
 * (edit)/(new)/(delete)/(deleteSelected) ligados aos métodos daqui.
 */
@Directive()
export abstract class CadastroListBase<T extends { id: number }> implements OnInit {
  protected readonly alertService = inject(AlertService);
  protected readonly exclusaoEmLote = inject(ExclusaoEmLoteService);
  private readonly destroyRef = inject(DestroyRef);

  /** Fonte: tudo o que veio da API. */
  registros: T[] = [];
  /** Projeção exibida no grid — nunca sobrescreve a fonte (ver FE-P0-10). */
  registrosExibidos: T[] = [];
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO };

  loading = false;
  showModalForm = false;
  editing: T | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  /** Nome da entidade, usado em todas as mensagens. */
  protected abstract readonly rotulo: RotuloEntidade;

  /** Linhas prontas para o grid (já com os campos derivados que a tela exibe). */
  protected abstract buscar(): Observable<T[]>;

  protected abstract excluirRegistro(id: number): Observable<unknown>;

  /** Nome exibido do registro: ordena o grid e aparece no confirm da exclusão. */
  protected abstract nomeDe(registro: T): string;

  /** Catálogos e colunas que dependem deles; roda uma vez, antes da primeira carga. */
  protected antesDeCarregar(): Observable<unknown> {
    return of(null);
  }

  ngOnInit() {
    this.carregar(this.antesDeCarregar().pipe(switchMap(() => this.buscar())));
  }

  load() {
    this.carregar(this.buscar());
  }

  private carregar(registros$: Observable<T[]>) {
    this.loading = true;
    registros$
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: registros => {
          this.registros = registros;
          this.applyFilters();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao carregar ${this.rotulo.plural}.`))
      });
  }

  applyFilters() {
    this.registrosExibidos = [...this.registros]
      .sort((a, b) => (this.nomeDe(a) ?? '').localeCompare(this.nomeDe(b) ?? ''));
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(registro: T) {
    this.editing = registro;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  onDelete(registro: T) {
    const { singular, feminino } = this.rotulo;
    const ok = window.confirm(`Excluir ${feminino ? 'a' : 'o'} ${singular} "${this.nomeDe(registro)}"?`);
    if (!ok) return;

    const entidade = singular.charAt(0).toUpperCase() + singular.slice(1);

    this.excluirRegistro(registro.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.alertService.success(`${entidade} ${feminino ? 'excluída' : 'excluído'} com sucesso!`);
          this.load();
        },
        error: e => this.alertService.error(extrairMensagemErro(
          e,
          `Falha ao excluir. ${entidade} pode estar ${feminino ? 'vinculada' : 'vinculado'} a outros registros.`
        ))
      });
  }

  onDeleteSelected(rows: T[]) {
    this.exclusaoEmLote
      .confirmarEExcluir(this.grid, rows, row => this.excluirRegistro(row.id), this.rotulo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(excluiu => {
        if (excluiu) this.load();
      });
  }
}
