import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterBarComponent } from './filter-bar.component';

@Component({
  standalone: true,
  imports: [FilterBarComponent],
  template: `
    <mf-filter-bar>
      <span inicio id="situacao">Todas</span>
      <input fim id="busca" />
    </mf-filter-bar>`
})
class HostComponent {}

/** Barra de filtros (card #27): situação à esquerda; busca, filtros e botões à direita. */
describe('FilterBarComponent', () => {
  it('põe cada conteúdo do seu lado', () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.mf-filter-bar__inicio #situacao')).not.toBeNull();
    expect(el.querySelector('.mf-filter-bar__fim #busca')).not.toBeNull();
  });
});
