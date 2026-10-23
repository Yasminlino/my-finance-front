import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo.component';
import { ExtratoBancarioModule } from '../extrato-bancario.module';

describe('ExtratoBancarioResumoComponent', () => {
  let component: ExtratoBancarioResumoComponent;
  let fixture: ComponentFixture<ExtratoBancarioResumoComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ExtratoBancarioModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(ExtratoBancarioResumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
