import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { RegraClassificacaoDto } from 'src/app/core/models/regra-classificacao.model';
import {
  destacar, ignorar, inicioCurto, inicioDaFrase, lerIgnoradas, mover, normalizarTexto, propostasDeRegra, textoSugerido, usoDaRegra
} from './classificacao.regras';

const item = (id: number, extra: Partial<ExtratoItemDto> = {}): ExtratoItemDto => ({
  id, dataMovimentacao: '2026-10-01', valor: 10, tipoLancamento: 'Saída', bancoId: 1, ...extra
});

/** Regras de classificação no front (card #76, fase 1). */
describe('classificacao.regras', () => {
  it('normaliza como a API: sem acento, maiúsculas e espaços simples', () => {
    expect(normalizarTexto('  Padaria  São João ')).toBe('PADARIA SAO JOAO');
    expect(normalizarTexto('   ')).toBe('');
  });

  it('texto sugerido: o estabelecimento (pessoa) ou a descrição sem números, sem o que vem depois do "*"', () => {
    expect(textoSugerido(item(1, { nomePessoaTransacao: 'IFOOD *RESTAURANTE 123', descricao: 'Compra no débito - IFOOD' }))).toBe('IFOOD');
    expect(textoSugerido(item(2, { descricao: 'UBER *TRIP 4567' }))).toBe('UBER');
    expect(textoSugerido(item(4, { nomePessoaTransacao: 'MP *MEVARIEDADES' }))).toBe('MP *MEVARIEDADES');
    expect(textoSugerido(item(5, { nomePessoaTransacao: 'DL*GOOGLE' }))).toBe('DL*GOOGLE');
    expect(textoSugerido(item(3, { descricao: 'Compra no débito - PADARIA DO ZÉ 22' }))).toBe('PADARIA DO ZÉ');
    expect(textoSugerido(item(4, { nomePessoaTransacao: 'EU', descricao: 'Anuidade' }))).toBe('ANUIDADE');
    expect(textoSugerido(item(5, {}))).toBe('');
  });

  it('propostas: só categorias novas, uma por texto, sem repetir regra que já existe', () => {
    const antes = [
      item(1, { descricao: 'IFOOD *A', categoriaId: null }), item(2, { descricao: 'IFOOD *B', categoriaId: null }),
      item(3, { descricao: 'UBER *TRIP', categoriaId: 4 }), item(4, { descricao: 'Mercado X', categoriaId: null }),
      item(5, { descricao: 'Padaria', categoriaId: null })
    ];
    const depois = [
      { ...antes[0], categoriaId: 8 }, { ...antes[1], categoriaId: 8 }, { ...antes[2], categoriaId: 9 }, { ...antes[3] },
      { ...antes[4], categoriaId: 2 }
    ];
    const regras: RegraClassificacaoDto[] = [{ id: 1, texto: 'PADARIA', categoriaId: 2, ativa: true }];

    expect(propostasDeRegra(antes, depois, regras)).toEqual([
      { texto: 'IFOOD', categoriaId: 8, tipoMovimentacaoId: null },
      { texto: 'UBER', categoriaId: 9, tipoMovimentacaoId: null }
    ]);
  });

  it('começo da frase pelo campo e operador', () => {
    expect(inicioDaFrase({})).toEqual({ campo: 'Descrição ou pessoa', operador: 'contém' });
    expect(inicioDaFrase({ campo: 'descricao', operador: 'comeca_com' })).toEqual({ campo: 'Descrição', operador: 'começa com' });
    expect(inicioDaFrase({ campo: 'pessoa', operador: 'igual' })).toEqual({ campo: 'Pessoa', operador: 'é' });
  });

  it('começo curto do card do celular: some no padrão', () => {
    expect(inicioCurto({})).toBe('');
    expect(inicioCurto({ operador: 'comeca_com' })).toBe('começa com');
    expect(inicioCurto({ campo: 'pessoa', operador: 'contem' })).toBe('pessoa contém');
    expect(inicioCurto({ campo: 'descricao', operador: 'igual' })).toBe('descrição é');
  });

  it('uso: vezes, última aplicação e desligada', () => {
    expect(usoDaRegra({ ativa: true, vezesAplicada: 12, ultimaAplicacao: '2026-02-04T12:00:00Z' })).toBe('aplicada 12 vezes · última 04/02');
    expect(usoDaRegra({ ativa: true, vezesAplicada: 1 })).toBe('aplicada 1 vez');
    expect(usoDaRegra({ ativa: false, vezesAplicada: 0 })).toBe('desligada · nunca aplicada');
  });

  it('destaca o pedaço que a regra pega, sem acento e maiúscula', () => {
    expect(destacar('Uber *Trip help.uber.com', 'UBER')).toEqual([
      { texto: 'Uber', marcado: true }, { texto: ' *Trip help.uber.com', marcado: false }
    ]);
    expect(destacar('Padaria São João', 'sao', 'contem')).toEqual([
      { texto: 'Padaria ', marcado: false }, { texto: 'São', marcado: true }, { texto: ' João', marcado: false }
    ]);
    expect(destacar('Auto Posto', 'POSTO', 'comeca_com')).toEqual([{ texto: 'Auto Posto', marcado: false }]);
    expect(destacar('Carlos', 'carlos', 'igual')).toEqual([{ texto: 'Carlos', marcado: true }]);
  });

  it('mover troca a posição sem mexer na lista original', () => {
    const lista = [1, 2, 3];
    expect(mover(lista, 2, 0)).toEqual([3, 1, 2]);
    expect(mover(lista, 0, 5)).toEqual([1, 2, 3]);
    expect(lista).toEqual([1, 2, 3]);
  });

  it('ignorar guarda o texto normalizado neste navegador', () => {
    localStorage.removeItem('regras-sugestoes-ignoradas');
    expect(lerIgnoradas()).toEqual([]);
    expect(ignorar(' mercado livre ')).toEqual(['MERCADO LIVRE']);
    expect(ignorar('Mercado Livre')).toEqual(['MERCADO LIVRE']);
    expect(lerIgnoradas()).toEqual(['MERCADO LIVRE']);
    localStorage.removeItem('regras-sugestoes-ignoradas');
  });
});
