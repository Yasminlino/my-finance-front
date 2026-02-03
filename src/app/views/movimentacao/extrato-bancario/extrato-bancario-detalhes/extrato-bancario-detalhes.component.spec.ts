import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes.component';

describe('ExtratoBancarioDetalhesComponent', () => {
  let component: ExtratoBancarioDetalhesComponent;
  let fixture: ComponentFixture<ExtratoBancarioDetalhesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtratoBancarioDetalhesComponent]
    });
    fixture = TestBed.createComponent(ExtratoBancarioDetalhesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
