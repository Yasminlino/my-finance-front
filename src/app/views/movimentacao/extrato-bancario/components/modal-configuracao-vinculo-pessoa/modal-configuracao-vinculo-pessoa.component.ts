import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import {
  PessoaMovimentacaoDto,
  PessoaMovimentacaoService
} from 'src/app/core/services/pessoa-movimentacao.service';

type Row = PessoaMovimentacaoDto;

@Component({
  selector: 'app-modal-configuracao-vinculo-pessoa',
  templateUrl: './modal-configuracao-vinculo-pessoa.component.html',
  styleUrls: ['./modal-configuracao-vinculo-pessoa.component.scss'],
})
export class ModalConfiguracaoVinculoPessoaComponent implements OnInit {
  @Output() closed = new EventEmitter<{ reload: boolean }>();

  loading = false;
  errorMsg = '';

  categorias: Category[] = [];
  tiposMovimentacao: any[] = [];

  rows: Row[] = [];
  savingIds = new Set<number>();

  constructor(
    private pessoaService: PessoaMovimentacaoService,
    private categoriaService: CategoryService,
    private tipoMovService: TipoMovimentacaoService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll() {
    this.loading = true;
    this.errorMsg = '';
    try {
      const [cats, tipos, pessoas] = await Promise.all([
        this.categoriaService.list(),
        this.tipoMovService.list(),
        this.pessoaService.list(),
      ]);

      this.categorias = cats ?? [];
      this.tiposMovimentacao = tipos ?? [];
      this.rows = (pessoas ?? []).map(p => ({ ...p }));
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'Erro ao carregar dados.';
    } finally {
      this.loading = false;
    }
  }

  close(reload = false) {
    this.closed.emit({ reload });
  }

  trackById = (_: number, r: Row) => r.id;

  addRow() {
    // id negativo = "ainda não salvo"
    const tempId = -Date.now();
    this.rows = [
      {
        id: tempId,
        nomePessoa: '',
        categoriaId: null,
        tipoMovimentacaoId: null
      },
      ...this.rows,
    ];
  }

  async saveRow(r: Row) {
    this.errorMsg = '';

    if (!r.nomePessoa?.trim()) {
      this.errorMsg = 'Informe o nome da pessoa.';
      return;
    }

    this.savingIds.add(r.id);

    try {
      // novo (id negativo)
      if (r.id < 0) {
        const created = await this.pessoaService.create({
          nomePessoa: r.nomePessoa.trim(),
          categoriaId: r.categoriaId ?? null,
          tipoMovimentacaoId: r.tipoMovimentacaoId ?? null,
        });

        // substitui o tempId pelo id real
        this.rows = this.rows.map(x => (x.id === r.id ? { ...created } : x));
      } else {
        await this.pessoaService.update(r.id, {
          id: r.id,
          nomePessoa: r.nomePessoa.trim(),
          categoriaId: r.categoriaId ?? null,
          tipoMovimentacaoId: r.tipoMovimentacaoId ?? null,
        });
      }
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'Erro ao salvar.';
    } finally {
      this.savingIds.delete(r.id);
    }
  }

  async removeRow(r: Row) {
    this.errorMsg = '';

    // se ainda não salvou, só remove do array
    if (r.id < 0) {
      this.rows = this.rows.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir "${r.nomePessoa}"?`)) return;

    this.savingIds.add(r.id);
    try {
      await this.pessoaService.delete(r.id);
      this.rows = this.rows.filter(x => x.id !== r.id);
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'Erro ao excluir.';
    } finally {
      this.savingIds.delete(r.id);
    }
  }
}
