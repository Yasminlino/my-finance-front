import { NomeExtratoDto } from 'src/app/core/models/nomes-extrato.model';
import {
  ABAS_NOMES, Classificacao, alteracoes, aplicarEmLote, comCategoria, contagens, contexto, filtrarNomes, sugestaoVisivel
} from './nomes-extrato.regras';

const nome = (texto: string, extra: Partial<NomeExtratoDto> = {}): NomeExtratoDto => ({
  texto, lancamentos: 1, ultimoUso: '2026-11-03', semCategoria: 0, cobertura: 'nenhuma', regraId: null, regraTexto: null,
  categoriaId: null, tipoMovimentacaoId: null, sugestaoCategoriaId: null, sugestaoTipoMovimentacaoId: null, ...extra
});

/** Card #79 — "Nomes do extrato". */
describe('nomes-extrato.regras', () => {
  const nomes = [
    nome('CIRCUITO', { cobertura: 'igual', categoriaId: 3, lancamentos: 12 }),
    nome('SUPERMERCADO BOM', { cobertura: 'outra', categoriaId: 3 }),
    nome('BARDOISIRMAOS', { cobertura: 'semelhanca', regraTexto: 'BAR DOIS IRMAOS', categoriaId: 4 }),
    nome('PADARIA SÃO JOSÉ', { sugestaoCategoriaId: 3, sugestaoTipoMovimentacaoId: 2 }),
    nome('FARMACIA')
  ];

  it('abas com contagens que somam o total', () => {
    const c = contagens(nomes);
    expect(c).toEqual({ classificar: 2, semelhanca: 1, classificados: 2, todos: 5 });
    expect(c.classificar + c.semelhanca + c.classificados).toBe(c.todos);
    expect(ABAS_NOMES.map(a => a.value)).toEqual(['classificar', 'semelhanca', 'classificados', 'todos']);
  });

  it('filtra pela aba, pela busca sem acento e pela categoria (a do rascunho vale)', () => {
    const textos = (l: NomeExtratoDto[]) => l.map(n => n.texto);
    expect(textos(filtrarNomes(nomes, { aba: 'classificar', busca: '', categoriaId: null }, {}))).toEqual(['PADARIA SÃO JOSÉ', 'FARMACIA']);
    expect(textos(filtrarNomes(nomes, { aba: 'todos', busca: 'sao jose', categoriaId: null }, {}))).toEqual(['PADARIA SÃO JOSÉ']);
    expect(textos(filtrarNomes(nomes, { aba: 'todos', busca: '', categoriaId: 4 }, {}))).toEqual(['BARDOISIRMAOS']);
    expect(textos(filtrarNomes(nomes, { aba: 'todos', busca: '', categoriaId: 9 }, { FARMACIA: { categoriaId: 9, tipoMovimentacaoId: null } })))
      .toEqual(['FARMACIA']);
  });

  it('só as mudanças viram pedido; sem categoria nem tipo não vai', () => {
    const rascunho: Record<string, Classificacao> = {
      CIRCUITO: { categoriaId: 3, tipoMovimentacaoId: null },          // igual ao que era
      FARMACIA: { categoriaId: 7, tipoMovimentacaoId: null },
      BARDOISIRMAOS: { categoriaId: 4, tipoMovimentacaoId: null },     // semelhança confirmada sem mudar: vira regra
      'PADARIA SÃO JOSÉ': { categoriaId: null, tipoMovimentacaoId: null }
    };
    expect(alteracoes(nomes, rascunho)).toEqual([
      { texto: 'BARDOISIRMAOS', categoriaId: 4, tipoMovimentacaoId: null },
      { texto: 'FARMACIA', categoriaId: 7, tipoMovimentacaoId: null }
    ]);
  });

  it('escolher a categoria da sugestão já traz o tipo sugerido; outra categoria mantém o tipo escolhido', () => {
    const padaria = nomes[3];
    expect(comCategoria(padaria, { categoriaId: null, tipoMovimentacaoId: null }, 3)).toEqual({ categoriaId: 3, tipoMovimentacaoId: 2 });
    expect(comCategoria(padaria, { categoriaId: null, tipoMovimentacaoId: 5 }, 3)).toEqual({ categoriaId: 3, tipoMovimentacaoId: 5 });
    expect(comCategoria(padaria, { categoriaId: null, tipoMovimentacaoId: null }, 8)).toEqual({ categoriaId: 8, tipoMovimentacaoId: null });
  });

  it('lote: aplica categoria e/ou tipo em todos os escolhidos', () => {
    const r = aplicarEmLote(nomes, {}, ['FARMACIA', 'CIRCUITO'], { categoriaId: 9, tipoMovimentacaoId: null });
    expect(r['FARMACIA']).toEqual({ categoriaId: 9, tipoMovimentacaoId: null });
    expect(r['CIRCUITO']).toEqual({ categoriaId: 9, tipoMovimentacaoId: null });
    const soTipo = aplicarEmLote(nomes, r, ['CIRCUITO'], { categoriaId: null, tipoMovimentacaoId: 6 });
    expect(soTipo['CIRCUITO']).toEqual({ categoriaId: 9, tipoMovimentacaoId: 6 });
  });

  it('sugestão aparece só sem regra, com sugestão diferente do rascunho', () => {
    expect(sugestaoVisivel(nomes[3], { categoriaId: null, tipoMovimentacaoId: null })).toBeTrue();
    expect(sugestaoVisivel(nomes[3], { categoriaId: 3, tipoMovimentacaoId: 2 })).toBeFalse();
    expect(sugestaoVisivel(nomes[4], { categoriaId: null, tipoMovimentacaoId: null })).toBeFalse();
    expect(sugestaoVisivel(nomes[0], { categoriaId: 3, tipoMovimentacaoId: null })).toBeFalse();
  });

  it('contexto da linha: lançamentos, último uso e "parecido com"', () => {
    expect(contexto(nomes[0])).toBe('12 lançamentos · último em 03/11');
    expect(contexto(nomes[4])).toBe('1 lançamento · último em 03/11');
    expect(contexto(nomes[2])).toBe('1 lançamento · parecido com BAR DOIS IRMAOS');
  });
});
