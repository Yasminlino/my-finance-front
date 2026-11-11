import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { CampoRegra, OperadorRegra, RegraClassificacaoDto } from 'src/app/core/models/regra-classificacao.model';

/** Regras de classificação no front (card #76, fase 1). Puras, para testar sem tela. */

/** Como a API compara: sem acento, maiúsculas e espaços simples. */
export function normalizarTexto(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Nome gravado da pessoa "Eu": não serve de texto de regra. */
const NOME_TITULAR = 'EU';

/**
 * Texto que a pergunta "Sempre classificar…?" já traz preenchido: o estabelecimento (o nome no campo Pessoa) ou a
 * descrição. Corta o que vem depois de "*" ("IFOOD *RESTAURANTE" vira "IFOOD"), menos depois de sigla curta de
 * intermediador ("MP *LOJA", "DL*GOOGLE" ficam inteiros); tira os números e o "Compra no débito - ". Igual à API.
 */
export function textoSugerido(item: Pick<ExtratoItemDto, 'descricao' | 'nomePessoaTransacao'>): string {
  const pessoa = (item.nomePessoaTransacao ?? '').trim();
  const usarPessoa = pessoa && normalizarTexto(pessoa) !== NOME_TITULAR;
  let base = usarPessoa ? pessoa : (item.descricao ?? '');
  if (!usarPessoa && base.includes(' - ')) base = base.slice(base.lastIndexOf(' - ') + 3);
  const asterisco = base.indexOf('*');
  if (asterisco >= 0 && base.slice(0, asterisco).trim().length > 3) base = base.slice(0, asterisco);
  return base.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

export type PropostaDeRegra = { texto: string; categoriaId: number; tipoMovimentacaoId: number | null };

/**
 * Depois de salvar: os lançamentos que ganharam uma categoria nova viram propostas de regra, uma por texto, sem repetir
 * o texto de uma regra que já existe.
 */
export function propostasDeRegra(
  antes: readonly ExtratoItemDto[], depois: readonly ExtratoItemDto[], regras: readonly RegraClassificacaoDto[]
): PropostaDeRegra[] {
  const original = new Map(antes.map(i => [i.id, i]));
  const jaExistem = new Set(regras.map(r => normalizarTexto(r.texto)));
  const propostas: PropostaDeRegra[] = [];
  for (const item of depois) {
    const anterior = original.get(item.id);
    if (!item.categoriaId || item.categoriaId === anterior?.categoriaId) continue;
    const texto = textoSugerido(item);
    if (texto.length < 2 || jaExistem.has(normalizarTexto(texto))) continue;
    jaExistem.add(normalizarTexto(texto));
    propostas.push({ texto, categoriaId: item.categoriaId, tipoMovimentacaoId: item.tipoMovimentacaoId ?? null });
  }
  return propostas;
}

// ---------- regra como frase (layout novo, 05/11) ----------

export const OPCOES_CAMPO: { label: string; value: CampoRegra }[] = [
  { label: 'a descrição ou a pessoa', value: 'descricao_ou_pessoa' },
  { label: 'a descrição', value: 'descricao' },
  { label: 'a pessoa', value: 'pessoa' },
  { label: 'o nome do extrato', value: 'nome_extrato' }
];

export const OPCOES_OPERADOR: { label: string; value: OperadorRegra }[] = [
  { label: 'contém', value: 'contem' },
  { label: 'começa com', value: 'comeca_com' },
  { label: 'é igual a', value: 'igual' }
];

/** Começo da frase na lista: "Descrição contém", "Pessoa é", "Descrição ou pessoa começa com". */
export function inicioDaFrase(r: Pick<RegraClassificacaoDto, 'campo' | 'operador'>): { campo: string; operador: string } {
  const campo = r.campo === 'descricao' ? 'Descrição' : r.campo === 'pessoa' ? 'Pessoa'
    : r.campo === 'nome_extrato' ? 'Nome do extrato' : 'Descrição ou pessoa';
  const operador = r.operador === 'comeca_com' ? 'começa com' : r.operador === 'igual' ? 'é' : 'contém';
  return { campo, operador };
}

/** Começo curto (cards do celular): "começa com", "pessoa", "descrição é"; vazio no padrão (descrição ou pessoa, contém). */
export function inicioCurto(r: Pick<RegraClassificacaoDto, 'campo' | 'operador'>): string {
  const campo = r.campo === 'descricao' ? 'descrição' : r.campo === 'pessoa' ? 'pessoa' : r.campo === 'nome_extrato' ? 'nome' : '';
  const operador = r.operador === 'comeca_com' ? 'começa com' : r.operador === 'igual' ? 'é' : (campo ? 'contém' : '');
  return [campo, operador].filter(Boolean).join(' ');
}

/** "aplicada 12 vezes · última 04/02", "nunca aplicada" ou "desligada". */
export function usoDaRegra(r: Pick<RegraClassificacaoDto, 'ativa' | 'vezesAplicada' | 'ultimaAplicacao'>): string {
  const vezes = r.vezesAplicada ?? 0;
  const partes: string[] = [];
  if (!r.ativa) partes.push('desligada');
  if (!vezes) {
    partes.push('nunca aplicada');
  } else {
    partes.push(vezes === 1 ? 'aplicada 1 vez' : `aplicada ${vezes} vezes`);
    const ultima = r.ultimaAplicacao ? new Date(r.ultimaAplicacao) : null;
    if (ultima && !isNaN(ultima.getTime())) {
      partes.push(`última ${String(ultima.getDate()).padStart(2, '0')}/${String(ultima.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  return partes.join(' · ');
}

export type Trecho = { texto: string; marcado: boolean };

/**
 * Parte o texto do lançamento para destacar o pedaço que a regra pega (sem acento e maiúscula, como a API).
 * Não achou: um trecho só, sem destaque.
 */
export function destacar(texto: string, termo: string, operador: OperadorRegra = 'contem'): Trecho[] {
  const alvo = normalizarTexto(termo);
  if (!texto || !alvo) return [{ texto: texto ?? '', marcado: false }];
  // Um caractere normalizado por caractere original, para as posições baterem.
  const chars = [...texto];
  const norm = chars.map(c => normalizarTexto(c) || ' ');
  if (norm.some(n => n.length !== 1)) return [{ texto, marcado: false }];
  const plano = norm.join('');
  let inicio = -1;
  if (operador === 'comeca_com') inicio = plano.trimStart().startsWith(alvo) ? plano.length - plano.trimStart().length : -1;
  else if (operador === 'igual') inicio = plano.trim() === alvo ? plano.indexOf(alvo) : -1;
  else inicio = plano.indexOf(alvo);
  if (inicio < 0) return [{ texto, marcado: false }];
  const fim = inicio + alvo.length;
  return [
    { texto: chars.slice(0, inicio).join(''), marcado: false },
    { texto: chars.slice(inicio, fim).join(''), marcado: true },
    { texto: chars.slice(fim).join(''), marcado: false }
  ].filter(t => t.texto.length > 0);
}

/** Cópia da lista com o item de `de` levado para `para`. */
export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  const copia = [...lista];
  if (de < 0 || de >= copia.length || para < 0 || para >= copia.length || de === para) return copia;
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

const CHAVE_IGNORADAS = 'regras-sugestoes-ignoradas';

/** Textos de "Sugestões do seu extrato" que você ignorou (só neste navegador; decisão de 05/11). */
export function lerIgnoradas(): string[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_IGNORADAS) ?? '[]');
    return Array.isArray(lista) ? lista.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function ignorar(texto: string): string[] {
  const lista = [...new Set([...lerIgnoradas(), normalizarTexto(texto)])];
  try {
    localStorage.setItem(CHAVE_IGNORADAS, JSON.stringify(lista));
  } catch { /* sem armazenamento: vale só até recarregar */ }
  return lista;
}
