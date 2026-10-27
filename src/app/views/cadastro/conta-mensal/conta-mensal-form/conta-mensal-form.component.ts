import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ContaService } from 'src/app/core/services/contas.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ContaDto } from 'src/app/core/models/conta.model';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { iconeDe } from 'src/app/shared/ui/aparencia';
import { nomesParecidos } from 'src/app/shared/utils/nomes-parecidos';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ChipsModule } from 'primeng/chips';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { PreviaParcelamento, diasDaConta, previaParcelamento, textoVencimento } from '../contas.regras';

/** Campos do passo 1 no celular: o que precisa estar certo para avançar. */
const CAMPOS_DO_PASSO_1 = ['nome', 'categoriaId', 'valor', 'dias'] as const;

/** 1 a 31, sem repetir, ao menos um (as mesmas regras da API). */
function diasValidos(controle: AbstractControl<string[]>): ValidationErrors | null {
  const dias = (controle.value ?? []).map(Number);
  if (!dias.length) return { required: true };
  if (dias.some(d => !Number.isInteger(d) || d < 1 || d > 31) || new Set(dias).size !== dias.length) return { dias: true };
  return null;
}

@Component({
  selector: 'app-conta-mensal-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormPanelComponent, FieldErrorComponent, CategoryIconComponent, DropdownModule,
    InputTextModule, InputNumberModule, ChipsModule, InputSwitchModule, InputTextareaModule, MessageModule
  ],
  templateUrl: './conta-mensal-form.component.html',
  styleUrls: ['./conta-mensal-form.component.scss']
})
export class ContaMensalFormComponent implements OnInit {
  /** Conta em edição; null = nova. A cópia do Duplicar chega com id 0 e também é nova (card #22). */
  @Input() registro: ContaDto | null = null;
  @Input() categories: CategoriaDto[] = [];
  /** Contas já cadastradas, para o aviso de nome parecido. */
  @Input() contas: ContaDto[] = [];
  /** true = gravou algo (a lista recarrega). */
  @Output() closed = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly contaService = inject(ContaService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  saving = false;
  passo = 1;
  /** Mensagem do último dia recusado no campo de dias (fora de 1 a 31 ou repetido). */
  avisoDia = '';
  /** "Salvar e criar outra" já gravou alguma: ao fechar, a lista recarrega. */
  private gravouAlguma = false;

  readonly form = this.fb.group({
    nome: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    valor: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    dias: this.fb.nonNullable.control<string[]>([], diasValidos),
    ehParcelado: this.fb.nonNullable.control(false),
    parcelaAtual: this.fb.nonNullable.control(1),
    quantidadeParcelas: this.fb.nonNullable.control(2),
    ativo: this.fb.nonNullable.control(true),
    observacao: this.fb.nonNullable.control('', Validators.maxLength(500))
  }, { validators: c => this.parcelasValidas(c) });

  get editando(): boolean {
    return !!this.registro?.id;
  }

  get passos(): number {
    return this.movel() ? 2 : 1;
  }

  /** No celular cada passo mostra só a sua parte; no desktop tudo aparece. */
  mostra(parte: 1 | 2): boolean {
    return this.passos === 1 || this.passo === parte;
  }

  get categoriaEscolhida(): CategoriaDto | undefined {
    return this.categories.find(c => c.id === this.form.controls.categoriaId.value);
  }

  get diasNumeros(): number[] {
    return [...new Set((this.form.controls.dias.value ?? []).map(Number))].sort((a, b) => a - b);
  }

  get textoDias(): string {
    return textoVencimento(this.diasNumeros);
  }

  get previa(): PreviaParcelamento | null {
    const v = this.form.getRawValue();
    if (!v.ehParcelado || this.form.hasError('parcelas')) return null;
    return previaParcelamento({ valor: v.valor ?? 0, dias: this.diasNumeros, parcelaAtual: v.parcelaAtual, total: v.quantidadeParcelas });
  }

  /** Outras contas com nome igual (sem acento, maiúscula, espaço) ou a uma letra; a própria não conta. */
  get parecidos(): string[] {
    const nome = this.form.controls.nome.value;
    if (!nome.trim()) return [];
    const outras = this.contas.filter(c => c.id !== this.registro?.id);
    return nomesParecidos([{ id: -1, nome }, ...outras]).get(-1) ?? [];
  }

  readonly iconeDe = iconeDe;
  readonly moeda = (valor: number) => formatCurrencyBR(valor);

  ngOnInit(): void {
    if (!this.registro) return;
    const r = this.registro;
    this.form.patchValue({
      nome: r.nome,
      categoriaId: r.categoriaId,
      valor: r.valor,
      dias: diasDaConta(r).map(String),
      ehParcelado: r.ehParcelado,
      parcelaAtual: r.ehParcelado ? r.parcelaAtual : 1,
      quantidadeParcelas: r.ehParcelado ? r.quantidadeParcelas : 2,
      ativo: r.ativo,
      observacao: r.observacao ?? ''
    });
  }

  /** Parcelada: total ≥ 1 e parcela atual de 0 até o total (o CHECK do banco; a API dá a mesma mensagem). */
  private parcelasValidas(grupo: AbstractControl): ValidationErrors | null {
    const { ehParcelado, parcelaAtual, quantidadeParcelas } = grupo.value ?? {};
    if (!ehParcelado) return null;
    const ok = quantidadeParcelas >= 1 && parcelaAtual >= 0 && parcelaAtual <= quantidadeParcelas;
    return ok ? null : { parcelas: true };
  }

  /** p-chips aceitou um dia: tira da lista se não for de 1 a 31 ou se já estava, e diz por quê. */
  aoAdicionarDia(valor: string) {
    const dias = this.form.controls.dias.value;
    const dia = Number(valor);
    const outros = dias.slice(0, -1).map(Number);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      this.avisoDia = `"${valor}" não é um dia: use números de 1 a 31.`;
    } else if (outros.includes(dia)) {
      this.avisoDia = `O dia ${dia} já está na lista.`;
    } else {
      this.avisoDia = '';
      return;
    }
    this.form.controls.dias.setValue(dias.slice(0, -1));
  }

  avancar() {
    const invalidos = CAMPOS_DO_PASSO_1.filter(campo => this.form.controls[campo].invalid);
    CAMPOS_DO_PASSO_1.forEach(campo => this.form.controls[campo].markAsTouched());
    if (!invalidos.length) this.passo = 2;
  }

  voltar() {
    this.passo = 1;
  }

  close() {
    this.closed.emit(this.gravouAlguma);
  }

  save() {
    this.gravar(false);
  }

  salvarEOutra() {
    this.gravar(true);
  }

  private gravar(criarOutra: boolean) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // No celular o erro pode estar no passo 1, que não aparece no passo 2.
      if (CAMPOS_DO_PASSO_1.some(campo => this.form.controls[campo].invalid)) this.passo = 1;
      return;
    }

    const v = this.form.getRawValue();
    const payload: Partial<ContaDto> = {
      ...(this.editando ? { id: this.registro!.id } : {}),
      nome: v.nome.trim(),
      categoriaId: v.categoriaId!,
      valor: v.valor ?? 0,
      dataOperacao: this.diasNumeros,
      ativo: v.ativo,
      ehParcelado: v.ehParcelado,
      // Não parcelada fica 0/0, como o banco guarda.
      parcelaAtual: v.ehParcelado ? v.parcelaAtual : 0,
      quantidadeParcelas: v.ehParcelado ? v.quantidadeParcelas : 0,
      observacao: v.observacao.trim() || null
    };

    this.saving = true;
    (this.editando ? this.contaService.atualizar(payload) : this.contaService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Conta salva com sucesso!');
          this.gravouAlguma = true;
          if (criarOutra) {
            this.form.reset();
            this.avisoDia = '';
            this.passo = 1;
          } else {
            this.close();
          }
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar conta.'))
      });
  }
}
