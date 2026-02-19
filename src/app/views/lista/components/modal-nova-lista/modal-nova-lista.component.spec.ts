import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNovaListaComponent } from './modal-nova-lista.component';

describe('ModalNovaListaComponent', () => {
  let component: ModalNovaListaComponent;
  let fixture: ComponentFixture<ModalNovaListaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalNovaListaComponent]
    });
    fixture = TestBed.createComponent(ModalNovaListaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
