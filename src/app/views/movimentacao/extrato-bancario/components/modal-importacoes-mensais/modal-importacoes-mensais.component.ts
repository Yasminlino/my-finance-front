import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import {
  PessoaMovimentacaoDto,
} from 'src/app/core/services/pessoa-movimentacao.service';
import { ExtratoBancarioDto, ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';

@Component({
  selector: 'app-modal-importacoes-mensais',
  templateUrl: './modal-importacoes-mensais.component.html',
  styleUrls: ['./modal-importacoes-mensais.component.scss'],
})
export class ModalImportacoesMensaisComponent implements OnInit {
  @Input() mesExtrato = '';
  @Output() closed = new EventEmitter<{ reload: boolean }>();

  loading = false;
  errorMsg = '';

  savingIds = new Set<number>();
  importacaoesMensais: ExtratoBancarioDto[] = [];

  constructor(
    private extratobancarioService: ExtratoBancarioService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll() {
    this.loading = true;
    this.errorMsg = '';
    try {
      this.importacaoesMensais = await this.extratobancarioService.listExtratos(this.mesExtrato);
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'Erro ao carregar dados.';
    } finally {
      this.loading = false;
    }
  }

  close(reload = false) {
    this.closed.emit({ reload });
  }

  trackById = (_: number, r: ExtratoBancarioDto) => r.id;

  async removeRow(r: ExtratoBancarioDto) {
    this.errorMsg = '';

    // se ainda não salvou, só remove do array
    if (r.id < 0) {
      this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir "${r.nomeArquivoOrigem}"?`)) return;

    this.savingIds.add(r.id);
    try {
      await this.extratobancarioService.deleteExtrato(r.id);
      this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'Erro ao excluir.';
    } finally {
      this.savingIds.delete(r.id);
    }
  }
}
