import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioGastosMensaisComponent } from './relatorio-gastos-mensais.component';

describe('RelatorioGastosMensaisComponent', () => {
  let component: RelatorioGastosMensaisComponent;
  let fixture: ComponentFixture<RelatorioGastosMensaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RelatorioGastosMensaisComponent]
    });
    fixture = TestBed.createComponent(RelatorioGastosMensaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
