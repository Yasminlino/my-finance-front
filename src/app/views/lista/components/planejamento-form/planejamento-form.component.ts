import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { finalize } from 'rxjs';
import { ListaDto, ModeloLista, ModoValorLista } from 'src/app/core/models/lista.model';
import { ListaService } from 'src/app/core/services/lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { IconPickerComponent } from 'src/app/shared/ui/icon-picker/icon-picker.component';
import { CAMPOS_DO_MODELO, corDaLista, iconeDaLista } from '../../listas.regras';

/** Campos que se ligam e desligam; desligar só esconde (os dados dos itens continuam gravados). */
const CAMPOS = ['usaQuantidade', 'usaValor', 'usaLimite', 'usaData', 'usaObservacao'] as const;

/** Grade curta do seletor; os outros vêm pela busca. */
const ICONES_PLANEJAMENTO: readonly string[] = [
  'pi pi-shopping-cart', 'pi pi-shopping-bag', 'pi pi-wallet', 'pi pi-money-bill', 'pi pi-check-square', 'pi pi-list-check',
  'pi pi-calendar', 'pi pi-clock', 'pi pi-home', 'pi pi-car', 'pi pi-heart', 'pi pi-gift',
  'pi pi-briefcase', 'pi pi-book', 'pi pi-graduation-cap', 'pi pi-globe', 'pi pi-sun', 'pi pi-star'
];

/**
 * Novo/editar planejamento (card #63), no lugar do modal provisório do #67: aparência, modelo (só ao criar,
 * pré-marca os campos), campos dos itens com o modo do valor e o limite, e a prévia de um item.
 */
@Component({
  selector: 'app-planejamento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, InputNumberModule, InputSwitchModule, InputTextModule, MessageModule, SelectButtonModule,
    CategoryIconComponent, FieldErrorComponent, FormPanelComponent, IconPickerComponent
  ],
  templateUrl: './planejamento-form.component.html',
  styleUrls: ['./planejamento-form.component.scss']
})
export class PlanejamentoFormComponent implements OnInit {
  /** Em edição; null = novo. */
  @Input() registro: ListaDto | null = null;
  /** true = gravou (a tela recarrega). */
  @Output() closed = new EventEmitter<boolean>();
  /** "Criar e abrir": o planejamento criado, para a tela abrir. */
  @Output() abrir = new EventEmitter<ListaDto>();

  private readonly fb = inject(FormBuilder);
  private readonly listaService = inject(ListaService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  readonly icones = ICONES_PLANEJAMENTO;

  readonly opcoesModelo: { label: string; value: ModeloLista; icone: string }[] = [
    { label: 'Compras', value: 'COMPRAS', icone: 'pi pi-shopping-cart' },
    { label: 'Orçamento', value: 'ORCAMENTO', icone: 'pi pi-wallet' },
    { label: 'Tarefas', value: 'TAREFAS', icone: 'pi pi-check-square' },
    { label: 'Agenda', value: 'AGENDA', icone: 'pi pi-calendar' },
    { label: 'Em branco', value: 'BRANCO', icone: 'pi pi-clipboard' }
  ];

  readonly opcoesModoValor: { label: string; value: ModoValorLista }[] = [
    { label: 'Unitário × qtd', value: 'UNITARIO' },
    { label: 'Total do item', value: 'TOTAL' }
  ];

  readonly form = this.fb.group({
    nome: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]),
    icone: this.fb.control<string | null>(null),
    cor: this.fb.control<string | null>(null),
    modelo: this.fb.nonNullable.control<ModeloLista>('COMPRAS'),
    usaQuantidade: this.fb.nonNullable.control(false),
    usaValor: this.fb.nonNullable.control(false),
    modoValor: this.fb.nonNullable.control<ModoValorLista>('TOTAL'),
    usaLimite: this.fb.nonNullable.control(false),
    limite: this.fb.control<number | null>(null, Validators.min(0)),
    usaData: this.fb.nonNullable.control(false),
    usaObservacao: this.fb.nonNullable.control(false)
  });

  get titulo(): string {
    return this.registro ? 'Editar planejamento' : 'Novo planejamento';
  }

  /** Ícone e cor da prévia: os escolhidos ou os automáticos (do modelo e dos campos). */
  get iconePrevia(): string {
    return iconeDaLista({ icone: this.form.controls.icone.value, modelo: this.registro?.modelo ?? this.form.controls.modelo.value });
  }

  get corPrevia(): string {
    const v = this.form.getRawValue();
    return corDaLista({ cor: v.cor, usaValor: v.usaValor, usaData: v.usaData });
  }

  /** Um item de exemplo como a tela da lista mostraria com os campos ligados. */
  get previa(): string {
    const v = this.form.getRawValue();
    const partes = [v.usaQuantidade ? 'Arroz × 2' : 'Arroz'];
    if (v.usaValor) {
      partes.push(v.modoValor === 'UNITARIO' && v.usaQuantidade
        ? `${this.moeda(6.5)} = ${this.moeda(13)}`
        : this.moeda(13));
    }
    if (v.usaData) partes.push('30/10');
    if (v.usaObservacao) partes.push('integral');
    return partes.join(' · ');
  }

  /** Em edição, algum campo que estava ligado foi desligado. */
  get desligouCampo(): boolean {
    const r = this.registro;
    if (!r) return false;
    const v = this.form.getRawValue();
    return CAMPOS.some(campo => r[campo] && !v[campo]);
  }

  ngOnInit(): void {
    const { controls } = this.form;
    controls.modelo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(modelo => this.aplicarModelo(modelo));
    controls.usaValor.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.ajustarLimite());
    controls.usaLimite.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.ajustarLimite());

    if (this.registro) {
      const r = this.registro;
      this.form.patchValue({
        nome: r.nome, icone: r.icone ?? null, cor: r.cor ?? null, modelo: r.modelo,
        usaQuantidade: r.usaQuantidade, usaValor: r.usaValor, modoValor: r.modoValor, usaLimite: r.usaLimite,
        limite: r.limite ?? null, usaData: r.usaData, usaObservacao: r.usaObservacao
      }, { emitEvent: false });
    } else {
      this.aplicarModelo(controls.modelo.value);
    }
    this.ajustarLimite();
  }

  /** O modelo só pré-marca os campos; depois a pessoa ajusta. */
  private aplicarModelo(modelo: ModeloLista) {
    this.form.patchValue(CAMPOS_DO_MODELO[modelo]);
  }

  /** Limite só com Valor (regra da API); com Limite ligado, o valor dele é obrigatório. */
  private ajustarLimite() {
    const { usaValor, usaLimite, limite } = this.form.controls;
    if (!usaValor.value) {
      usaLimite.setValue(false, { emitEvent: false });
      usaLimite.disable({ emitEvent: false });
    } else {
      usaLimite.enable({ emitEvent: false });
    }
    limite.setValidators(usaLimite.value ? [Validators.required, Validators.min(0)] : [Validators.min(0)]);
    limite.updateValueAndValidity({ emitEvent: false });
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor).replace(/\s/g, ' ');
  }

  aoEscolherIcone(icone: string | null) {
    this.form.controls.icone.setValue(icone);
  }

  aoEscolherCor(cor: string | null) {
    this.form.controls.cor.setValue(cor);
  }

  close() {
    this.closed.emit(false);
  }

  save() {
    this.gravar(false);
  }

  criarEAbrir() {
    this.gravar(true);
  }

  private gravar(abrirDepois: boolean) {
    this.ajustarLimite();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload = {
      ...this.registro,
      id: this.registro?.id ?? 0,
      nome: v.nome.trim(),
      icone: v.icone,
      cor: v.cor,
      modelo: this.registro?.modelo ?? v.modelo,
      usaQuantidade: v.usaQuantidade,
      usaValor: v.usaValor,
      modoValor: v.modoValor,
      usaLimite: v.usaLimite,
      limite: v.limite,
      usaData: v.usaData,
      usaObservacao: v.usaObservacao,
      resumo: undefined
    };

    this.saving = true;
    (this.registro ? this.listaService.atualizar(payload) : this.listaService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: salvo => {
          this.alertService.success('Planejamento salvo.');
          if (abrirDepois) this.abrir.emit(salvo);
          else this.closed.emit(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar o planejamento.'))
      });
  }
}
