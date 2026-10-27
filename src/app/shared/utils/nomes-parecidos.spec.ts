import { nomesParecidos, normalizarNome } from './nomes-parecidos';

/** Comparação de nomes dos cadastros (cards #23 e #22): serve para qualquer registro com id e nome. */
describe('nomes-parecidos', () => {
  it('normaliza acento, maiúscula e espaços', () => {
    expect(normalizarNome('  Cartão   CAIXA ')).toBe('cartao caixa');
  });

  it('acha iguais sem maiúscula e espaço, e repetidos exatos', () => {
    const parecidos = nomesParecidos([
      { id: 1, nome: 'Cartão Caixa ' }, { id: 2, nome: 'Cartão caixa' },
      { id: 3, nome: 'Cartão Nubank' }, { id: 4, nome: 'Cartão Nubank' },
      { id: 5, nome: 'Internet' }
    ]);

    expect(parecidos.get(1)).toEqual(['Cartão caixa']);
    expect(parecidos.get(3)).toEqual(['Cartão Nubank']);
    expect(parecidos.has(5)).toBeFalse();
  });
});
