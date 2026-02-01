import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalEstruturaComponent } from './conta-mensal-estrutura.component';

describe('ContaMensalEstruturaComponent', () => {
  let component: ContaMensalEstruturaComponent;
  let fixture: ComponentFixture<ContaMensalEstruturaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalEstruturaComponent]
    });
    fixture = TestBed.createComponent(ContaMensalEstruturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
