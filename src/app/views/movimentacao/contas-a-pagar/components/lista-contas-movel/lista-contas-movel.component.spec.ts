import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ListaContasMovelComponent } from './lista-contas-movel.component';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';

/** Contas a Pagar no celular: lista de cards, filtros, toque longo para seleção e ações em lote. */
describe('ListaContasMovelComponent', () => {
  const hoje = new Date(2026, 9, 17, 10, 0);

  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, idAccount: 1, name: 'Luz', value: 100, date: '2026-10-20' as any, ehParcelado: false,
    categoryId: 1, categoryName: 'Moradia', tipoContaId: '', subCategoryName: 'Despesa',
    status: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false,
    ...parcial
  });

  const contas = [
    conta({ id: 1, name: 'Energia elétrica', value: 200 }),
    conta({ id: 2, name: 'Aluguel', value: 1500, date: '2026-10-05' as any }),
    conta({ id: 3, name: 'Salário', value: 5000, categoryName: 'Renda', subCategoryName: 'Receita', status: 'PAGO NO PRAZO' }),
    conta({ id: 4, name: 'Carro', value: 800, categoryName: 'Transporte', ehParcelado: true, parcelaAtual: 8, quantidadeParcelas: 12 })
  ];

  let fixture: ComponentFixture<ListaContasMovelComponent>;
  let lista: ListaContasMovelComponent;
  let editadas: LinhaContasMensais[];
  let pagas: LinhaContasMensais[][];
  let excluidas: LinhaContasMensais[][];
  const el = () => fixture.nativeElement as HTMLElement;
  const card = (id: number) => el().querySelector<HTMLElement>(`#card-conta-${id}`)!;
  const ids = () => Array.from(el().querySelectorAll('.card-conta')).map(c => Number(c.id.replace('card-conta-', '')));
  const ponteiro = (id: number, tipo: string) => card(id).dispatchEvent(new PointerEvent(tipo, { bubbles: true }));

  const toqueLongo = (id: number) => {
    ponteiro(id, 'pointerdown');
    tick(500);
    ponteiro(id, 'pointerup');
    card(id).click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ListaContasMovelComponent],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(ListaContasMovelComponent);
    lista = fixture.componentInstance;
    fixture.componentRef.setInput('hoje', hoje);
    fixture.componentRef.setInput('contas', contas);
    editadas = [];
    pagas = [];
    excluidas = [];
    lista.editar.subscribe(c => editadas.push(c));
    lista.marcarPago.subscribe(c => pagas.push(c));
    lista.excluir.subscribe(c => excluidas.push(c));
    fixture.detectChanges();
  });

  describe('cards e filtros', () => {
    it('um card por conta, por vencimento, com borda de atrasada e de receita', () => {
      expect(ids()).toEqual([2, 4, 1, 3]);
      expect(card(2).classList).toContain('borda-atrasada');
      expect(card(3).classList).toContain('borda-receita');
      expect(card(1).classList).not.toContain('borda-atrasada');
      expect(card(4).textContent).toContain('8 / 12');
      expect(card(2).textContent).toContain('Vencida há 12 dias');
    });

    it('filtro de situação e busca', () => {
      lista.filtro = 'vencidas';
      lista.aplicarFiltros();
      fixture.detectChanges();
      expect(ids()).toEqual([2]);

      lista.filtro = 'todas';
      lista.busca = 'eletrica';
      lista.aplicarFiltros();
      fixture.detectChanges();
      expect(ids()).toEqual([1]);
    });

    it('categorias ficam no painel de filtros; o botão mostra quantas estão ativas', () => {
      expect(lista.categorias).toEqual(['Moradia', 'Renda', 'Transporte']);
      expect(el().querySelector('.botao-filtros .p-badge')).toBeNull();

      lista.categoriasSelecionadas = ['Transporte', 'Renda'];
      lista.aplicarFiltros();
      fixture.detectChanges();

      expect(ids()).toEqual([4, 3]);
      expect(el().querySelector('.botao-filtros .p-badge')?.textContent?.trim()).toBe('2');

      lista.limparFiltros();
      fixture.detectChanges();
      expect(ids()).toEqual([2, 4, 1, 3]);
    });

    it('tocar no card abre a edição; o ✓ marca como pago sem abrir a edição', () => {
      card(1).click();
      expect(editadas).toEqual([contas[0]]);

      card(1).querySelector<HTMLButtonElement>('.acao-pagar button')!.click();
      expect(pagas).toEqual([[contas[0]]]);
      expect(editadas.length).toBe(1);
      expect(card(3).querySelector('.acao-pagar')).toBeNull();
    });
  });

  describe('seleção por toque longo', () => {
    it('toque curto não seleciona: abre a edição', fakeAsync(() => {
      ponteiro(1, 'pointerdown');
      tick(200);
      ponteiro(1, 'pointerup');
      card(1).click();
      tick(500);
      fixture.detectChanges();

      expect(lista.modoSelecao).toBeFalse();
      expect(editadas).toEqual([contas[0]]);
    }));

    it('toque longo entra na seleção com a conta; depois cada toque marca ou desmarca', fakeAsync(() => {
      toqueLongo(2);

      expect(lista.modoSelecao).toBeTrue();
      expect(editadas).toEqual([]);
      expect(card(2).classList).toContain('selecionado');
      expect(el().querySelector('.barra-selecao')?.textContent).toContain('1 selecionada');

      card(1).click();
      fixture.detectChanges();
      expect(el().querySelector('.barra-selecao')?.textContent).toContain('2 selecionadas');

      card(1).click();
      fixture.detectChanges();
      expect(card(1).classList).not.toContain('selecionado');
    }));

    it('desmarcar a última sai da seleção; o ✕ também', fakeAsync(() => {
      toqueLongo(2);
      card(2).click();
      fixture.detectChanges();
      expect(lista.modoSelecao).toBeFalse();

      toqueLongo(2);
      el().querySelector<HTMLButtonElement>('.barra-selecao .fechar-selecao button')!.click();
      fixture.detectChanges();
      expect(lista.modoSelecao).toBeFalse();
      expect(el().querySelector('.barra-selecao')).toBeNull();
    }));

    it('"Selecionar todas" pega as visíveis no filtro atual', fakeAsync(() => {
      lista.filtro = 'a-vencer';
      lista.aplicarFiltros();
      fixture.detectChanges();
      toqueLongo(1);

      lista.selecionarTodas();
      fixture.detectChanges();

      expect(lista.selecionadas().map(c => c.id).sort()).toEqual([1, 4]);
    }));

    it('barra de lote: totais da seleção, pagar só as abertas, excluir todas, concluirExclusao limpa', fakeAsync(() => {
      toqueLongo(1);
      card(3).click();
      fixture.detectChanges();

      const barra = (el().querySelector('.barra-lote-movel')?.textContent ?? '').replace(/\s+/g, ' ');
      expect(barra).toMatch(/Despesa\s*R\$\s*200,00/);
      expect(barra).toMatch(/Receita\s*R\$\s*5\.000,00/);

      lista.pagarSelecionadas();
      lista.excluirSelecionadas();
      expect(pagas).toEqual([[contas[0]]]);
      expect(excluidas.map(l => l.map(c => c.id).sort())).toEqual([[1, 3]]);

      lista.concluirExclusao(true);
      expect(lista.modoSelecao).toBeFalse();
    }));
  });
});
