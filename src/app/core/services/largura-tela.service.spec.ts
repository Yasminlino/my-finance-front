import { TestBed } from '@angular/core/testing';

import { LarguraTelaService } from './largura-tela.service';

/** Detecta a largura de celular (abaixo de 768px) e acompanha a mudança. */
describe('LarguraTelaService', () => {
  let ouvinte: ((e: { matches: boolean }) => void) | null;
  let consulta: string;

  const simular = (casa: boolean) => {
    ouvinte = null;
    spyOn(window, 'matchMedia').and.callFake((q: string) => {
      consulta = q;
      return {
        matches: casa,
        addEventListener: (_: string, fn: any) => (ouvinte = fn),
        removeEventListener: () => (ouvinte = null)
      } as unknown as MediaQueryList;
    });
  };

  it('começa com o estado atual da media query de celular', () => {
    simular(true);
    const servico = TestBed.inject(LarguraTelaService);

    expect(consulta).toBe('(max-width: 767.98px)');
    expect(servico.movel()).toBeTrue();
  });

  it('acompanha quando a largura cruza o limite', () => {
    simular(false);
    const servico = TestBed.inject(LarguraTelaService);
    expect(servico.movel()).toBeFalse();

    ouvinte!({ matches: true });
    expect(servico.movel()).toBeTrue();
  });
});
