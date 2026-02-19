import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaDeChecagemComponent } from './lista-de-checagem.component';

describe('ListaDeChecagemComponent', () => {
  let component: ListaDeChecagemComponent;
  let fixture: ComponentFixture<ListaDeChecagemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaDeChecagemComponent]
    });
    fixture = TestBed.createComponent(ListaDeChecagemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
