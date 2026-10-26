import { ICONES_CATEGORIA, PALETA_CATEGORIA, classeDaCor } from './aparencia';

/** Aparência da categoria (card #23): a cor é uma chave da paleta; o ícone, um PrimeIcons. */
describe('aparência da categoria', () => {
  it('a classe da cor vem da chave da paleta', () => {
    expect(classeDaCor('verde-agua')).toBe('mf-cor-verde-agua');
  });

  it('sem cor, ou com uma chave que não é da paleta, não há classe (vale a natureza)', () => {
    expect(classeDaCor(null)).toBeNull();
    expect(classeDaCor('')).toBeNull();
    expect(classeDaCor('#ff0000')).toBeNull();
  });

  it('a paleta é a mesma que a API aceita', () => {
    expect(PALETA_CATEGORIA.map(c => c.chave)).toEqual(
      ['azul', 'roxo', 'verde-agua', 'verde', 'laranja', 'indigo', 'rosa', 'vermelho', 'amarelo', 'cinza']);
  });

  it('todos os ícones seguem o padrão que a API aceita, sem repetir', () => {
    expect(ICONES_CATEGORIA.every(i => /^pi pi-[a-z0-9-]+$/.test(i))).toBeTrue();
    expect(new Set(ICONES_CATEGORIA).size).toBe(ICONES_CATEGORIA.length);
  });
});
