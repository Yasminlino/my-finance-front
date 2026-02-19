import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaDeCronogramaComponent } from './lista-de-cronograma.component';

describe('ListaDeCronogramaComponent', () => {
  let component: ListaDeCronogramaComponent;
  let fixture: ComponentFixture<ListaDeCronogramaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListaDeCronogramaComponent]
    });
    fixture = TestBed.createComponent(ListaDeCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
