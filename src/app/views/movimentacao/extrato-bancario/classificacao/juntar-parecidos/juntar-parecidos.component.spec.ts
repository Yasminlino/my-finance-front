import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { GrupoParecidosDto } from 'src/app/core/models/nomes-extrato.model';
import { NomesExtratoService } from 'src/app/core/services/nomes-extrato.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { JuntarParecidosComponent } from './juntar-parecidos.component';

/** Card #79 — "Juntar nomes parecidos", um grupo por vez. */
describe('JuntarParecidosComponent', () => {
  let fixture: ComponentFixture<JuntarParecidosComponent>;
  let servico: jasmine.SpyObj<NomesExtratoService>;
  const grupos: GrupoParecidosDto[] = [
    { divergem: true, regras: [
      { id: 1, texto: 'BAR DOIS IRMAOS', categoriaId: 4, tipoMovimentacaoId: null, lancamentos: 2 },
      { id: 2, texto: 'BARDOISIRMAOS', categoriaId: 3, tipoMovimentacaoId: null, lancamentos: 7 }
    ] },
    { divergem: false, regras: [
      { id: 5, texto: 'TELEFONICA', categoriaId: 3, tipoMovimentacaoId: null, lancamentos: 1 },
      { id: 6, texto: 'TELEFONICA BRAS', categoriaId: 3, tipoMovimentacaoId: null, lancamentos: 1 }
    ] }
  ];
  const comp = () => fixture.componentInstance;

  beforeEach(() => {
    servico = jasmine.createSpyObj<NomesExtratoService>('NomesExtratoService', ['juntar']);
    servico.juntar.and.returnValue(of({ regras: 1, lancamentos: 0 }));
    TestBed.configureTestingModule({
      imports: [JuntarParecidosComponent],
      providers: [
        provideNoopAnimations(),
        { provide: NomesExtratoService, useValue: servico },
        { provide: AlertService, useValue: jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(JuntarParecidosComponent);
    fixture.componentRef.setInput('grupos', grupos);
    fixture.componentRef.setInput('categorias', [{ label: 'Mercado', value: 3 }, { label: 'Lazer', value: 4 }]);
    fixture.detectChanges();
  });

  it('começa no 1º grupo com a regra de mais lançamentos marcada', () => {
    expect(comp().indice).toBe(0);
    expect(comp().manterId).toBe(2);
    expect(comp().descricao(grupos[0].regras[0])).toBe('Lazer');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 de 2');
  });

  it('Juntar manda o grupo e a escolhida; Pular no último fecha contando só os juntados', () => {
    const fim: number[] = [];
    comp().concluiu.subscribe(n => fim.push(n));
    comp().manterId = 1;
    comp().aplicarAosImportados = false;

    comp().juntar();
    expect(servico.juntar).toHaveBeenCalledWith([1, 2], 1, false);
    expect(comp().indice).toBe(1);
    expect(comp().manterId).toBe(5);

    comp().pular();
    expect(fim).toEqual([1]);
  });
});
