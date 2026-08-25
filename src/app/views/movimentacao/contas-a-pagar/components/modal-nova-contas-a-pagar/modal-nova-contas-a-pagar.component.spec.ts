import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNovaContasAPagarComponent } from './modal-nova-contas-a-pagar.component';

describe('ModalNovaContasAPagarComponent', () => {
  let component: ModalNovaContasAPagarComponent;
  let fixture: ComponentFixture<ModalNovaContasAPagarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalNovaContasAPagarComponent]
    });
    fixture = TestBed.createComponent(ModalNovaContasAPagarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
