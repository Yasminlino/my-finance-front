import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNovoItemListaComponent } from './modal-novo-item-lista.component';

describe('ModalNovoItemListaComponent', () => {
  let component: ModalNovoItemListaComponent;
  let fixture: ComponentFixture<ModalNovoItemListaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalNovoItemListaComponent]
    });
    fixture = TestBed.createComponent(ModalNovoItemListaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
