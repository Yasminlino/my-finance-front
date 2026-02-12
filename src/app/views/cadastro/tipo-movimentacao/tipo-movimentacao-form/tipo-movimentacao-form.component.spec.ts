import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoMovimentacaoFormComponent } from './tipo-movimentacao-form.component';

describe('TipoMovimentacaoFormComponent', () => {
  let component: TipoMovimentacaoFormComponent;
  let fixture: ComponentFixture<TipoMovimentacaoFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TipoMovimentacaoFormComponent]
    });
    fixture = TestBed.createComponent(TipoMovimentacaoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
