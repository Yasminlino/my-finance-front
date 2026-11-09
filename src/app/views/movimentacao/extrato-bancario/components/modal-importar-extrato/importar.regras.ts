import { LinhaPreviaImportacaoDto, OpcoesImportacaoDto } from 'src/app/core/models/extrato.model';

/** Regras do assistente de importação (card #74), sem Angular. */

export type FiltroConferir = 'todos' | 'sem-categoria' | 'duplicados';

export const FORMATOS_ACEITOS = 'CSV do Nubank e do PicPay · PDF do extrato Caixa e das faturas Caixa e PicPay';

export function filtrarLinhas(
  linhas: readonly LinhaPreviaImportacaoDto[], filtro: FiltroConferir, busca: string, categorias: ReadonlyMap<string, number | null>
): LinhaPreviaImportacaoDto[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  return linhas.filter(l => {
    if (filtro === 'duplicados' && !l.duplicado) return false;
    if (filtro === 'sem-categoria' && (l.duplicado || categorias.get(l.chave) != null)) return false;
    return !termo || l.descricao.toLocaleLowerCase('pt-BR').includes(termo) || (l.nomePessoa ?? '').toLocaleLowerCase('pt-BR').includes(termo);
  });
}

/** Só manda o que mudou: as desmarcadas e as categorias diferentes da sugerida. */
export function montarOpcoes(
  linhas: readonly LinhaPreviaImportacaoDto[], marcadas: ReadonlySet<string>, categorias: ReadonlyMap<string, number | null>
): OpcoesImportacaoDto {
  const novas = linhas.filter(l => !l.duplicado);
  const trocadas = novas.filter(l => marcadas.has(l.chave) && (categorias.get(l.chave) ?? null) !== (l.categoriaId ?? null));
  return {
    pular: novas.filter(l => !marcadas.has(l.chave)).map(l => l.chave),
    categorias: Object.fromEntries(trocadas.map(l => [l.chave, categorias.get(l.chave) ?? null]))
  };
}

/** O que o passo Pronto mostra das linhas que entraram. */
export function resumoDoQueEntrou(
  linhas: readonly LinhaPreviaImportacaoDto[], marcadas: ReadonlySet<string>, categorias: ReadonlyMap<string, number | null>
): { semCategoria: number; pessoas: string[] } {
  const entraram = linhas.filter(l => !l.duplicado && marcadas.has(l.chave));
  const pessoas = [...new Set(entraram.filter(l => l.entraNosAcertos && l.nomePessoa).map(l => l.nomePessoa!))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { semCategoria: entraram.filter(l => categorias.get(l.chave) == null).length, pessoas };
}
