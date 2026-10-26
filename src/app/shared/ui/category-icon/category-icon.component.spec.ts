import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryIconComponent } from './category-icon.component';

/** Ícone da categoria com a cor da natureza (card #27): a mesma em Contas a Pagar, Contas e Categorias. */
describe('CategoryIconComponent', () => {
  let fixture: ComponentFixture<CategoryIconComponent>;
  const icone = () => (fixture.nativeElement as HTMLElement).querySelector('span.mf-icone-categoria')!;

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryIconComponent);
  });

  it('usa a cor da natureza e o ícone pedido', () => {
    fixture.componentRef.setInput('natureza', 2);
    fixture.componentRef.setInput('icone', 'pi pi-shopping-cart');
    fixture.detectChanges();

    expect(icone().classList).toContain('mf-natureza-2');
    expect(icone().querySelector('i')?.className).toBe('pi pi-shopping-cart');
  });

  it('a cor escolhida na categoria vale mais que a da natureza (card #23)', () => {
    fixture.componentRef.setInput('natureza', 2);
    fixture.componentRef.setInput('cor', 'laranja');
    fixture.detectChanges();

    expect(icone().classList).toContain('mf-cor-laranja');
    expect(icone().classList).not.toContain('mf-natureza-2');
  });

  it('cor fora da paleta é ignorada e vale a natureza', () => {
    fixture.componentRef.setInput('natureza', 1);
    fixture.componentRef.setInput('cor', '#ff0000');
    fixture.detectChanges();

    expect(icone().classList).toContain('mf-natureza-1');
  });

  it('sem natureza, a cor neutra e o ícone padrão', () => {
    fixture.componentRef.setInput('natureza', null);
    fixture.detectChanges();

    expect(icone().classList).toContain('mf-natureza-neutra');
    expect(icone().querySelector('i')?.className).toBe('pi pi-tag');
  });
});
