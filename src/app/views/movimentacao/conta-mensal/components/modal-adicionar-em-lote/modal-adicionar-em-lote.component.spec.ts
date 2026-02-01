import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAdicionarEmLoteComponent } from './modal-adicionar-em-lote.component';

describe('ModalAdicionarEmLoteComponent', () => {
  let component: ModalAdicionarEmLoteComponent;
  let fixture: ComponentFixture<ModalAdicionarEmLoteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalAdicionarEmLoteComponent]
    });
    fixture = TestBed.createComponent(ModalAdicionarEmLoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
