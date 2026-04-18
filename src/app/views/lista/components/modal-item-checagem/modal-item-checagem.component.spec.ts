import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalItemChecagemComponent } from './modal-item-checagem.component';

describe('ModalItemChecagemComponent', () => {
  let component: ModalItemChecagemComponent;
  let fixture: ComponentFixture<ModalItemChecagemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalItemChecagemComponent]
    });
    fixture = TestBed.createComponent(ModalItemChecagemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
