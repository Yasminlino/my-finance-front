import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalFiltrosComponent } from './conta-mensal-filtros.component';

describe('ContaMensalFiltrosComponent', () => {
  let component: ContaMensalFiltrosComponent;
  let fixture: ComponentFixture<ContaMensalFiltrosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalFiltrosComponent]
    });
    fixture = TestBed.createComponent(ContaMensalFiltrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
