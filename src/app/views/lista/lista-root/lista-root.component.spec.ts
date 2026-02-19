import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaRootComponent } from './lista-root.component';

describe('ListaRootComponent', () => {
  let component: ListaRootComponent;
  let fixture: ComponentFixture<ListaRootComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaRootComponent]
    });
    fixture = TestBed.createComponent(ListaRootComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
