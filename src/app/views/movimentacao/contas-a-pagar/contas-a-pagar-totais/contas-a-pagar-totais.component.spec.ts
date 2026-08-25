import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContasAPagarTotaisComponent } from './contas-a-pagar-totais.component';

describe('ContasAPagarTotaisComponent', () => {
  let component: ContasAPagarTotaisComponent;
  let fixture: ComponentFixture<ContasAPagarTotaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContasAPagarTotaisComponent]
    });
    fixture = TestBed.createComponent(ContasAPagarTotaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
