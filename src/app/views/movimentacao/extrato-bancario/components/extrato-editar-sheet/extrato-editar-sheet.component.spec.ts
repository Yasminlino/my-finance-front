import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ExtratoEditarSheetComponent } from './extrato-editar-sheet.component';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';

/** Folha de baixo do Extrato no celular (card #45, parte 1, item 4). */
describe('ExtratoEditarSheetComponent', () => {
  let fixture: ComponentFixture<ExtratoEditarSheetComponent>;
  const comp = () => fixture.componentInstance;
  const el = () => document.body;

  const item: ExtratoItemDto = {
    id: 3, dataMovimentacao: '2026-10-01T00:00:00', valor: 30, tipoLancamento: 'Saída', bancoId: 1, descricao: 'Padaria',
    ehParcelado: true, parcelaAtual: 1, quantidadeParcelas: 3
  };

  function abrir(com: ExtratoItemDto | null = item) {
    fixture = TestBed.createComponent(ExtratoEditarSheetComponent);
    fixture.componentRef.setInput('item', com);
    fixture.componentRef.setInput('pessoas', [{ id: 9, nomePessoa: 'Giovanne', categoriaId: null, tipoMovimentacaoId: null }]);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [ExtratoEditarSheetComponent], providers: [provideNoopAnimations()] }));

  afterEach(() => fixture?.destroy());

  it('abre com uma cópia do lançamento (data só com o dia) e o título com tipo e valor', () => {
    abrir();
    expect(comp().aberta).toBeTrue();
    expect(comp().rascunho?.dataMovimentacao).toBe('2026-10-01');
    expect(comp().titulo).toContain('Saída de');
    expect(el().querySelector('#sheet-descricao')).not.toBeNull();
    expect(el().querySelector('[aria-label="Total de parcelas"]')).not.toBeNull();
  });

  it('Salvar só com alteração; devolve o rascunho sem mexer no original', () => {
    abrir();
    const salvos: ExtratoItemDto[] = [];
    comp().salvar.subscribe(s => salvos.push(s));
    comp().confirmar();
    expect(salvos.length).toBe(0);
    expect(comp().alterou).toBeFalse();

    comp().rascunho!.descricao = 'Padaria do bairro';
    expect(comp().alterou).toBeTrue();
    comp().confirmar();
    expect(salvos[0].descricao).toBe('Padaria do bairro');
    expect(item.descricao).toBe('Padaria');
  });

  it('pessoa cadastrada liga pelo id; fechar avisa a tela; sem item, fechada', () => {
    abrir();
    comp().editarPessoa('giovanne');
    expect(comp().rascunho).toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: 9, nomePessoaTransacao: 'Giovanne' }));
    let fechou = 0;
    comp().fechar.subscribe(() => fechou++);
    comp().aoMudarVisivel(false);
    expect(fechou).toBe(1);

    fixture.destroy();
    abrir(null);
    expect(comp().aberta).toBeFalse();
    expect(comp().rascunho).toBeNull();
  });
});
