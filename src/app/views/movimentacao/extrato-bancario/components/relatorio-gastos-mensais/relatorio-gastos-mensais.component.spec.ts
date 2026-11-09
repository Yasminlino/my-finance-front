import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { RelatorioGastosMensaisComponent } from './relatorio-gastos-mensais.component';
import { ExtratoBancarioModule } from '../../extrato-bancario.module';

describe('RelatorioGastosMensaisComponent', () => {
  let component: RelatorioGastosMensaisComponent;
  let fixture: ComponentFixture<RelatorioGastosMensaisComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ExtratoBancarioModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(RelatorioGastosMensaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('o mês escolhido é o último da evolução e o tooltip mostra o resultado', () => {
    (component as unknown as { aplicarEvolucao(m: unknown[]): void }).aplicarEvolucao([
      { mes: '2026-09', entradas: 1, saidas: 2, resultado: -1 },
      { mes: '2026-10', entradas: 10, saidas: 4, resultado: 6 }
    ]);

    expect(component.doMes?.resultado).toBe(6);
    expect(component.graficoEvolucao?.series.map(s => s.name)).toEqual(['Entradas', 'Saídas']);
    const titulo = component.graficoEvolucao?.tooltip?.x?.formatter as (v: number, o: { dataPointIndex: number }) => string;
    expect(titulo(0, { dataPointIndex: 1 })).toContain('out/2026');
    expect(titulo(0, { dataPointIndex: 1 })).toContain('6,00');
  });
});
