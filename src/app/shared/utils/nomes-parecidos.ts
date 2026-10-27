/**
 * Nomes parecidos nos cadastros (Categorias #23, Contas #22): iguais sem acento, maiúscula e espaços, ou com uma
 * letra de diferença. Sem Angular; serve para qualquer registro com id e nome.
 */

/** Nome para comparar: sem acento, minúsculo e com os espaços normalizados. */
export function normalizarNome(nome: string | null | undefined): string {
  return (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Abaixo disso, uma letra de diferença é comum entre nomes legítimos ("Casa" × "Cara"). */
const TAMANHO_MINIMO_PARA_ERRO_DE_DIGITACAO = 5;

/** True se dá para ir de a para b com no máximo uma troca, inclusão ou remoção de letra. */
function umaLetraDeDiferenca(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function parecidos(a: string, b: string): boolean {
  if (a === b) return true;
  return Math.min(a.length, b.length) >= TAMANHO_MINIMO_PARA_ERRO_DE_DIGITACAO && umaLetraDeDiferenca(a, b);
}

/** Para cada registro com nome parecido com o de outro, os nomes dos outros. Registro sem parecido não entra no mapa. */
export function nomesParecidos(registros: readonly { id: number; nome: string }[]): Map<number, string[]> {
  const normalizados = registros.map(r => ({ registro: r, nome: normalizarNome(r.nome) }));
  const resultado = new Map<number, string[]>();

  for (const a of normalizados) {
    const outros = normalizados
      .filter(b => b.registro.id !== a.registro.id && parecidos(a.nome, b.nome))
      .map(b => b.registro.nome);
    if (outros.length) resultado.set(a.registro.id, outros);
  }
  return resultado;
}
