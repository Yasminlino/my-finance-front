import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaDeOrcamentoComponent } from './lista-de-orcamento.component';

describe('ListaDeOrcamentoComponent', () => {
  let component: ListaDeOrcamentoComponent;
  let fixture: ComponentFixture<ListaDeOrcamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaDeOrcamentoComponent]
    });
    fixture = TestBed.createComponent(ListaDeOrcamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
