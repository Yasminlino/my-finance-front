import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ApexChartComponent } from './apex-chart.component';
import { ChartsModule } from '../charts.module';

describe('ApexChartComponent', () => {
  let component: ApexChartComponent;
  let fixture: ComponentFixture<ApexChartComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ChartsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(ApexChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', { series: [{ name: 'Gastos', data: [10] }], chart: { type: 'bar', animations: { enabled: false } } });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
