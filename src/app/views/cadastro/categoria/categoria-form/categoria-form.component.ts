import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { ICONES_CATEGORIA, PALETA_CATEGORIA, iconeDe } from 'src/app/shared/ui/aparencia';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { NaturezaOperacao } from 'src/app/shared/enums/natureza-operacao.enum';
import { TipoCategoria, naturezasDoTipo, tipoNaturezaIncompativel } from '../categorias.regras';

/** Rótulo e descrição de cada natureza nos cards do formulário. */
const NATUREZAS: Record<number, { label: string; descricao: string }> = {
  [NaturezaOperacao.RendimentoEntrada]: { label: 'Rendimento / Entrada', descricao: 'Salário, bônus e o que entra na conta.' },
  [NaturezaOperacao.Essencial]: { label: 'Essencial', descricao: 'Moradia, mercado, saúde e contas da casa.' },
  [NaturezaOperacao.EstilodeVidaLazer]: { label: 'Estilo de vida / Lazer', descricao: 'Restaurantes, passeios, viagens e assinaturas.' },
  [NaturezaOperacao.ReservaInvestimento]: { label: 'Reserva / Investimentos', descricao: 'Poupança, aplicações e reserva de emergência.' },
  [NaturezaOperacao.Pessoal]: { label: 'Pessoal', descricao: 'Gastos pessoais de quem toca a empresa.' },
  [NaturezaOperacao.Empresa]: { label: 'Empresa', descricao: 'Gastos da operação da empresa.' }
};

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormPanelComponent, FieldErrorComponent, CategoryIconComponent, InputTextModule,
    SelectButtonModule, RadioButtonModule, InputSwitchModule, MessageModule, TooltipModule
  ],
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.scss']
})
export class CategoriaFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: CategoriaDto | null = null;
  /** true = gravou algo (a lista recarrega). */
  @Output() closed = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  /** "Salvar e criar outra" já gravou alguma: ao fechar, a lista recarrega. */
  private gravouAlguma = false;

  readonly opcoesTipo: { label: string; value: TipoCategoria }[] = [
    { label: 'Despesa', value: 'Despesa' },
    { label: 'Receita', value: 'Receita' }
  ];
  readonly icones = ICONES_CATEGORIA;
  readonly paleta = PALETA_CATEGORIA;

  readonly perfilEmpresa = localStorage.getItem('usuarioRole') === 'Empresa';

  readonly form = this.fb.group({
    nome: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    tipo: this.fb.control<TipoCategoria | null>('Despesa', Validators.required),
    natureza: this.fb.control<number | null>(null, [Validators.required, c => this.naturezaDoTipo(c)]),
    icone: this.fb.control<string | null>(null),
    cor: this.fb.control<string | null>(null),
    ativo: this.fb.nonNullable.control(true)
  });

  get opcoesNatureza(): { value: number; label: string; descricao: string }[] {
    return naturezasDoTipo(this.form.controls.tipo.value, this.perfilEmpresa).map(value => ({ value, ...NATUREZAS[value] }));
  }

  /** Dado gravado antes da regra (ex.: Ágatha, Despesa com Rendimento / Entrada). */
  get incompativel(): boolean {
    return !!this.registro && tipoNaturezaIncompativel(this.registro)
      && this.form.controls.natureza.value === this.registro.naturezaOperacao;
  }

  get iconePrevia(): string {
    return iconeDe({ icone: this.form.controls.icone.value, nome: this.form.controls.nome.value });
  }

  ngOnInit(): void {
    this.form.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tipo => this.ajustarNatureza(tipo));

    if (this.registro) {
      this.form.patchValue({
        nome: this.registro.nome,
        tipo: this.registro.subcategoria === 'Receita' ? 'Receita' : 'Despesa',
        icone: this.registro.icone ?? null,
        cor: this.registro.cor ?? null,
        ativo: this.registro.ativo
      });
      // Depois do tipo: a troca de tipo limpa a natureza da Despesa (a da Receita é sempre 0).
      if (this.form.controls.tipo.value === 'Despesa') {
        this.form.controls.natureza.setValue(this.registro.naturezaOperacao);
        this.form.controls.natureza.markAsTouched();
      }
    }
  }

  /** Receita: "Rendimento / Entrada" e travada. Despesa: limpa, para a pessoa escolher. */
  private ajustarNatureza(tipo: TipoCategoria | null) {
    const natureza = this.form.controls.natureza;
    if (tipo === 'Receita') {
      natureza.setValue(NaturezaOperacao.RendimentoEntrada);
      natureza.disable({ emitEvent: false });
    } else {
      natureza.enable({ emitEvent: false });
      natureza.setValue(null);
    }
  }

  private naturezaDoTipo(controle: AbstractControl<number | null>): ValidationErrors | null {
    const tipo = this.form?.controls.tipo.value;
    if (controle.value == null || !tipo) return null;
    return naturezasDoTipo(tipo, this.perfilEmpresa).includes(controle.value) ? null : { naturezaDoTipo: true };
  }

  escolherIcone(icone: string | null) {
    this.form.controls.icone.setValue(icone);
  }

  escolherCor(cor: string | null) {
    this.form.controls.cor.setValue(cor);
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
    this.form.controls.natureza.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const payload = {
      nome: valor.nome.trim(),
      subcategoria: valor.tipo!,
      naturezaOperacao: valor.natureza!,
      icone: valor.icone,
      cor: valor.cor,
      ativo: valor.ativo
    };

    this.saving = true;
    (this.registro ? this.categoryService.atualizar({ id: this.registro.id, ...payload }) : this.categoryService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Categoria salva com sucesso!');
          this.gravouAlguma = true;
          if (criarOutra) {
            this.form.reset({ nome: '', tipo: valor.tipo, natureza: null, icone: null, cor: null, ativo: true });
            this.ajustarNatureza(valor.tipo);
          } else {
            this.close();
          }
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar categoria.'))
      });
  }
}
