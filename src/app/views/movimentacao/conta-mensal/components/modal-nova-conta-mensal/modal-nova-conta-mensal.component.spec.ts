import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNovaContaMensalComponent } from './modal-nova-conta-mensal.component';

describe('ModalNovaContaMensalComponent', () => {
  let component: ModalNovaContaMensalComponent;
  let fixture: ComponentFixture<ModalNovaContaMensalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalNovaContaMensalComponent]
    });
    fixture = TestBed.createComponent(ModalNovaContaMensalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
