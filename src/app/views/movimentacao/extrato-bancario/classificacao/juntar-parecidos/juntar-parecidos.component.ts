import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { finalize } from 'rxjs';
import { GrupoParecidosDto, RegraParecidaDto } from 'src/app/core/models/nomes-extrato.model';
import { NomesExtratoService } from 'src/app/core/services/nomes-extrato.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';

type Opcao = { label: string; value: number };

/**
 * Card #79/#80 — "Juntar nomes parecidos" (2º nível dentro de "Nomes e regras"): um grupo por vez ("1 de N"). Escolhe a classificação que vale (a regra que
 * fica); as outras regras do grupo saem e a semelhança passa a cobrir os nomes delas. Pular deixa o grupo como está.
 */
@Component({
  selector: 'app-juntar-parecidos',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, RadioButtonModule],
  templateUrl: './juntar-parecidos.component.html',
  styleUrls: ['./juntar-parecidos.component.scss']
})
export class JuntarParecidosComponent implements OnInit {
  @Input() grupos: GrupoParecidosDto[] = [];
  @Input() categorias: Opcao[] = [];
  @Input() tipos: Opcao[] = [];
  @Input() movel = false;
  /** Quantos grupos foram juntados (0 = nada mudou). */
  @Output() concluiu = new EventEmitter<number>();

  private readonly servico = inject(NomesExtratoService);
  private readonly alert = inject(AlertService);

  indice = 0;
  manterId: number | null = null;
  aplicarAosImportados = true;
  salvando = false;
  private juntados = 0;

  get grupo(): GrupoParecidosDto | undefined {
    return this.grupos[this.indice];
  }

  ngOnInit(): void {
    this.prepararGrupo();
  }

  descricao(r: RegraParecidaDto): string {
    const categoria = this.categorias.find(c => c.value === r.categoriaId)?.label ?? 'Sem categoria';
    const tipo = this.tipos.find(t => t.value === r.tipoMovimentacaoId)?.label;
    return tipo ? `${categoria} · ${tipo}` : categoria;
  }

  lancamentos(r: RegraParecidaDto): string {
    return `${r.lancamentos} ${r.lancamentos === 1 ? 'lançamento' : 'lançamentos'}`;
  }

  pular(): void {
    this.avancar();
  }

  juntar(): void {
    const g = this.grupo;
    if (!g || this.manterId == null || this.salvando) return;
    this.salvando = true;
    this.servico.juntar(g.regras.map(r => r.id), this.manterId, this.aplicarAosImportados)
      .pipe(finalize(() => (this.salvando = false)))
      .subscribe({
        next: r => {
          this.juntados++;
          if (r.lancamentos) this.alert.success(`${r.lancamentos} ${r.lancamentos === 1 ? 'lançamento atualizado' : 'lançamentos atualizados'}.`);
          this.avancar();
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Não foi possível juntar. Tente de novo.'))
      });
  }

  fechar(): void {
    this.concluiu.emit(this.juntados);
  }

  private avancar(): void {
    this.indice++;
    if (this.indice >= this.grupos.length) {
      this.fechar();
      return;
    }
    this.prepararGrupo();
  }

  /** Já vem marcada a regra com mais lançamentos (a que mais aparece). */
  private prepararGrupo(): void {
    const g = this.grupo;
    this.manterId = g ? [...g.regras].sort((a, b) => b.lancamentos - a.lancamentos || a.id - b.id)[0]?.id ?? null : null;
  }
}
