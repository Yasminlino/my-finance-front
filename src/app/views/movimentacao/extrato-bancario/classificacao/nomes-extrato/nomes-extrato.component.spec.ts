import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NomeExtratoDto } from 'src/app/core/models/nomes-extrato.model';
import { NomesExtratoService } from 'src/app/core/services/nomes-extrato.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { NomesExtratoComponent } from './nomes-extrato.component';

/** Card #79 — aba "Nomes do extrato". */
describe('NomesExtratoComponent', () => {
  let fixture: ComponentFixture<NomesExtratoComponent>;
  let servico: jasmine.SpyObj<NomesExtratoService>;
  const nome = (texto: string, extra: Partial<NomeExtratoDto> = {}): NomeExtratoDto => ({
    texto, lancamentos: 2, ultimoUso: '2026-11-03', semCategoria: 2, cobertura: 'nenhuma', regraId: null, regraTexto: null,
    categoriaId: null, tipoMovimentacaoId: null, sugestaoCategoriaId: null, sugestaoTipoMovimentacaoId: null, ...extra
  });
  let lista: NomeExtratoDto[];
  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;

  const abrir = (movel = false) => {
    fixture = TestBed.createComponent(NomesExtratoComponent);
    fixture.componentRef.setInput('categorias', [{ label: 'Mercado', value: 3 }, { label: 'Lazer', value: 4 }]);
    fixture.componentRef.setInput('tipos', [{ label: 'Essencial', value: 2 }]);
    fixture.componentRef.setInput('movel', movel);
    fixture.detectChanges();
  };

  beforeEach(() => {
    lista = [
      nome('CIRCUITO', { cobertura: 'igual', categoriaId: 3, semCategoria: 0 }),
      nome('PADARIA', { sugestaoCategoriaId: 3, sugestaoTipoMovimentacaoId: 2 }),
      nome('FARMACIA')
    ];
    servico = jasmine.createSpyObj<NomesExtratoService>('NomesExtratoService', ['listar', 'grupos', 'classificar', 'juntar']);
    servico.listar.and.callFake(() => of(lista));
    servico.grupos.and.returnValue(of([]));
    servico.classificar.and.returnValue(of({ regras: 2, lancamentos: 3 }));
    TestBed.configureTestingModule({
      imports: [NomesExtratoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: NomesExtratoService, useValue: servico },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']) }
      ]
    });
  });

  it('abre em "Para classificar" com as contagens nas abas', () => {
    abrir();
    expect(comp().filtro.aba).toBe('classificar');
    expect(comp().visiveis.map(n => n.texto)).toEqual(['PADARIA', 'FARMACIA']);
    expect(comp().opcoesAba.map(a => a.label)).toEqual(['Para classificar (2)', 'Por semelhança (0)', 'Classificados (1)', 'Todos (3)']);
  });

  it('tudo classificado abre em "Todos"', () => {
    lista = [nome('CIRCUITO', { cobertura: 'igual', categoriaId: 3 })];
    abrir();
    expect(comp().filtro.aba).toBe('todos');
  });

  it('✓ aceita a sugestão (com o tipo) sem abrir nada; o rodapé mostra a alteração', () => {
    abrir();
    const botao = el().querySelector<HTMLButtonElement>('.nomes-sugestao');
    expect(botao?.textContent).toContain('Mercado');
    botao!.click();
    fixture.detectChanges();

    expect(comp().agora(lista[1])).toEqual({ categoriaId: 3, tipoMovimentacaoId: 2 });
    expect(comp().temAlteracoes).toBeTrue();
    expect(el().querySelector('.nomes-salvar')?.textContent).toContain('1 alteração não salva');
  });

  it('lote aplica a categoria em todos os escolhidos; Salvar manda o pedido e recarrega', () => {
    abrir();
    const salvou: number[] = [];
    comp().salvou.subscribe(v => salvou.push(v));
    comp().selecionados = [lista[1], lista[2]];
    comp().lote = { categoriaId: 4, tipoMovimentacaoId: null };
    comp().aplicarLote();
    comp().aplicarAosImportados = false;

    comp().salvar();

    expect(servico.classificar).toHaveBeenCalledWith([
      { texto: 'FARMACIA', categoriaId: 4, tipoMovimentacaoId: null },
      { texto: 'PADARIA', categoriaId: 4, tipoMovimentacaoId: null }
    ], false);
    expect(salvou).toEqual([3]);
    expect(comp().temAlteracoes).toBeFalse();
    expect(servico.listar).toHaveBeenCalledTimes(2);
  });

  it('Descartar volta ao que estava', () => {
    abrir();
    comp().escolherCategoria(lista[2], 4);
    expect(comp().temAlteracoes).toBeTrue();
    comp().descartar();
    expect(comp().temAlteracoes).toBeFalse();
  });

  it('celular: cartões; tocar abre o painel e "Pronto" guarda no rascunho', () => {
    abrir(true);
    expect(el().querySelectorAll('.nomes-cartao').length).toBe(2);
    expect(el().querySelector('p-table')).toBeNull();

    comp().abrir(lista[2]);
    comp().editarCategoriaNoPainel(4);
    comp().confirmarPainel();

    expect(comp().emEdicao).toBeNull();
    expect(comp().agora(lista[2]).categoriaId).toBe(4);
  });
});
