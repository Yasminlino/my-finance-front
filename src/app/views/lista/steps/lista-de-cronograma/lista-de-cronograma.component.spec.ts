import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ListaDeCronogramaComponent } from './lista-de-cronograma.component';
import { ListaModule } from '../../lista.module';

describe('ListaDeCronogramaComponent', () => {
  let component: ListaDeCronogramaComponent;
  let fixture: ComponentFixture<ListaDeCronogramaComponent>;

  beforeEach(() => {
    // Montado no próprio módulo (declara os componentes filhos), com HTTP de teste: o
    // "should create" do gerador falhava sem providers (FE-P3-04).
    TestBed.configureTestingModule({
      imports: [ListaModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService]
    });
    fixture = TestBed.createComponent(ListaDeCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
