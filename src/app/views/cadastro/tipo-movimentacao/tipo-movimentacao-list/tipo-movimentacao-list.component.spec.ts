import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoMovimentacaoListComponent } from './tipo-movimentacao-list.component';

describe('TipoMovimentacaoListComponent', () => {
  let component: TipoMovimentacaoListComponent;
  let fixture: ComponentFixture<TipoMovimentacaoListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TipoMovimentacaoListComponent]
    });
    fixture = TestBed.createComponent(TipoMovimentacaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
