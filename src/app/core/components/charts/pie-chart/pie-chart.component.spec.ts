import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PieChartComponent } from './pie-chart.component';
import { ChartsModule } from '../charts.module';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ChartsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', { series: [10], labels: ['Essencial'], chart: { type: 'pie' } });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
