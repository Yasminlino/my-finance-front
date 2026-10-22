import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';

import { EditarContaSheetComponent } from './editar-conta-sheet.component';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';

/** Edição de uma conta no celular (bottom sheet): mesmos destaques e validação do desktop. */
describe('EditarContaSheetComponent', () => {
  const hoje = new Date(2026, 9, 17, 10, 0);

  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, contaId: 1, nome: 'Doces', valor: 70, data: '2026-10-05' as any, ehParcelado: false,
    categoriaId: 1, categoriaNome: 'Alimentação', tipoContaId: '', subcategoriaNome: 'Despesa',
    situacao: 'AGUARDANDO', statusSalvo: 'AGUARDANDO', desbloqueiaCampos: false, observacao: '',
    ...parcial
  });

  let fixture: ComponentFixture<EditarContaSheetComponent>;
  let sheet: EditarContaSheetComponent;
  let salvas: LinhaContasMensais[];
  let confirmacao: ConfirmationService;
  const el = () => document.body;
  const painel = () => el().querySelector<HTMLElement>('.sheet-conta')!;
  const texto = () => (painel()?.textContent ?? '').replace(/\s+/g, ' ');
  const botao = (rotulo: string) =>
    Array.from(painel().querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes(rotulo))!;

  const abrir = (c: LinhaContasMensais) => {
    fixture.componentRef.setInput('conta', c);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditarContaSheetComponent],
      providers: [provideNoopAnimations(), ConfirmationService]
    });
    fixture = TestBed.createComponent(EditarContaSheetComponent);
    sheet = fixture.componentInstance;
    confirmacao = TestBed.inject(ConfirmationService);
    fixture.componentRef.setInput('hoje', hoje);
    salvas = [];
    sheet.salvar.subscribe(c => salvas.push(c));
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('fechado sem conta; com conta mostra nome, categoria e os campos', () => {
    expect(painel()).toBeNull();

    abrir(conta({}));

    expect(texto()).toContain('Doces');
    expect(texto()).toContain('Alimentação');
    expect(painel().querySelector('p-inputNumber')).not.toBeNull();
    expect(painel().querySelector('p-dropdown')).not.toBeNull();
    expect(painel().querySelector('p-calendar')).not.toBeNull();
    expect(painel().querySelector('textarea')).not.toBeNull();
    expect(texto()).not.toContain('Parcela');
  });

  it('parcela atual só em conta parcelada, com o total como texto', () => {
    abrir(conta({ ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 3 }));

    expect(texto()).toContain('Parcela');
    expect(texto()).toContain('de 3');
  });

  it('alterar: contador de alterações, valor anterior riscado e salvar com a conta alterada', () => {
    abrir(conta({}));
    sheet.alterar('valor', 85);
    sheet.alterar('data', new Date(2026, 9, 20));
    fixture.detectChanges();

    expect(texto()).toContain('2 alterações');
    expect(painel().querySelector('s')?.textContent?.replace(/\s/g, ' ')).toContain('R$ 70,00');
    expect(texto()).toContain('Deixa de ficar atrasada');

    botao('Salvar').click();
    expect(salvas.length).toBe(1);
    expect(salvas[0].valor).toBe(85);
    expect(salvas[0].id).toBe(1);
  });

  it('erro em vermelho bloqueia o salvar; Desfazer volta tudo', () => {
    abrir(conta({}));
    sheet.alterar('valor', 0);
    fixture.detectChanges();

    expect(texto()).toContain('Informe um valor maior que zero.');
    expect(painel().querySelector('p-inputNumber')!.classList).toContain('ng-invalid');
    expect(botao('Salvar').disabled).toBeTrue();

    botao('Desfazer').click();
    fixture.detectChanges();
    expect(sheet.rascunho!.valor).toBe(70);
    expect(texto()).not.toContain('alteração');
  });

  it('conta paga abre só leitura; Desbloquear pede confirmação e libera os campos', () => {
    abrir(conta({ situacao: 'PAGO NO PRAZO' }));

    expect(painel().querySelector('p-inputNumber')).toBeNull();
    expect(texto()).toContain('Conta paga');

    spyOn(confirmacao, 'confirm').and.callFake(c => { c.accept!(); return confirmacao; });
    botao('Desbloquear').click();
    fixture.detectChanges();

    expect(confirmacao.confirm).toHaveBeenCalled();
    expect(painel().querySelector('p-inputNumber')).not.toBeNull();
  });
});
