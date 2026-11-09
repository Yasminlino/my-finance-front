import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ResumoCategoriasComponent, textoVariacao } from './resumo-categorias.component';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Aba Resumo do Extrato (card #76, fase 5). */
describe('ResumoCategoriasComponent', () => {
  let fixture: ComponentFixture<ResumoCategoriasComponent>;
  let servico: jasmine.SpyObj<ExtratoBancarioItemService>;
  const texto = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['resumoCategorias']);
    servico.resumoCategorias.and.returnValue(of({
      mes: '2026-10', total: 500, mediaAnterior: 400, variacaoTotal: 25, mesesComparados: 3, deOutrasPessoas: 40, foraDoResumo: 0,
      categorias: [{ categoriaId: 1, nome: 'Alimentação', valor: 300, percentual: 60, media: 400, variacao: -25 }]
    }));
    TestBed.configureTestingModule({
      imports: [ResumoCategoriasComponent],
      providers: [{ provide: ExtratoBancarioItemService, useValue: servico }, { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['error']) }]
    });
    fixture = TestBed.createComponent(ResumoCategoriasComponent);
    fixture.componentRef.setInput('mes', '2026-10');
    fixture.detectChanges();
  });

  it('mostra total, categorias, comparação e o que ficou à parte', () => {
    expect(servico.resumoCategorias).toHaveBeenCalledWith('2026-10');
    expect(texto()).toContain('Alimentação');
    expect(texto()).toContain('25% abaixo da média');
    expect(texto()).toContain('25% acima da média');
    expect(texto()).toContain('De outras pessoas');
    expect(texto()).not.toContain('Pagamento de fatura');
  });

  it('recarrega ao trocar de mês', () => {
    fixture.componentRef.setInput('mes', '2026-11');
    fixture.detectChanges();
    expect(servico.resumoCategorias).toHaveBeenCalledWith('2026-11');
  });

  it('texto da variação', () => {
    expect(textoVariacao(null)).toBe('');
    expect(textoVariacao(0)).toBe('na média');
    expect(textoVariacao(-10)).toBe('10% abaixo da média');
  });
});
