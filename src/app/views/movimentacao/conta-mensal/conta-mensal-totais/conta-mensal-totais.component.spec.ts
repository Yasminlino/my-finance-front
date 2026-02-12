import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalTotaisComponent } from './conta-mensal-totais.component';

describe('ContaMensalTotaisComponent', () => {
  let component: ContaMensalTotaisComponent;
  let fixture: ComponentFixture<ContaMensalTotaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalTotaisComponent]
    });
    fixture = TestBed.createComponent(ContaMensalTotaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
