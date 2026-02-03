import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo.component';

describe('ExtratoBancarioResumoComponent', () => {
  let component: ExtratoBancarioResumoComponent;
  let fixture: ComponentFixture<ExtratoBancarioResumoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtratoBancarioResumoComponent]
    });
    fixture = TestBed.createComponent(ExtratoBancarioResumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
