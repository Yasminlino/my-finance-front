/**
 * Aparência da categoria (card #23). A categoria guarda a chave da cor, nunca o hex: a cor em si sai dos
 * tokens mf-cor-<chave> (src/styles/_tokens.scss). A API aceita exatamente estas chaves e ícones
 * "pi pi-<nome>" (CategoriaService.Paleta). Sem cor, vale a da natureza (card #27).
 */
export const PALETA_CATEGORIA = [
  { chave: 'azul', rotulo: 'Azul' },
  { chave: 'roxo', rotulo: 'Roxo' },
  { chave: 'verde-agua', rotulo: 'Verde-água' },
  { chave: 'verde', rotulo: 'Verde' },
  { chave: 'laranja', rotulo: 'Laranja' },
  { chave: 'indigo', rotulo: 'Índigo' },
  { chave: 'rosa', rotulo: 'Rosa' },
  { chave: 'vermelho', rotulo: 'Vermelho' },
  { chave: 'amarelo', rotulo: 'Amarelo' },
  { chave: 'cinza', rotulo: 'Cinza' }
] as const;

export type CorCategoria = (typeof PALETA_CATEGORIA)[number]['chave'];

const CHAVES = new Set<string>(PALETA_CATEGORIA.map(c => c.chave));

/** Ícones oferecidos no formulário (todos existem no PrimeIcons 8 do projeto). */
export const ICONES_CATEGORIA: readonly string[] = [
  'pi pi-home', 'pi pi-car', 'pi pi-shopping-cart', 'pi pi-shopping-bag', 'pi pi-heart', 'pi pi-credit-card',
  'pi pi-wallet', 'pi pi-money-bill', 'pi pi-dollar', 'pi pi-briefcase', 'pi pi-book', 'pi pi-graduation-cap',
  'pi pi-bolt', 'pi pi-wifi', 'pi pi-phone', 'pi pi-mobile', 'pi pi-desktop', 'pi pi-gift',
  'pi pi-users', 'pi pi-user', 'pi pi-sun', 'pi pi-star', 'pi pi-building', 'pi pi-chart-line',
  'pi pi-percentage', 'pi pi-sync', 'pi pi-truck', 'pi pi-ticket', 'pi pi-globe', 'pi pi-shield',
  'pi pi-wrench', 'pi pi-receipt', 'pi pi-tag', 'pi pi-box'
];

/** Classe da cor escolhida (mf-cor-azul…); null quando não há cor válida, e aí vale a natureza. */
export function classeDaCor(cor: string | null | undefined): string | null {
  return cor && CHAVES.has(cor) ? `mf-cor-${cor}` : null;
}

/** Palavra-chave (sem acento, minúscula) -> ícone. A primeira que aparecer no nome vence. */
const ICONES_POR_PALAVRA: Array<[string, string]> = [
  ['morad', 'pi pi-home'],
  ['aluguel', 'pi pi-home'],
  ['casa', 'pi pi-home'],
  ['condominio', 'pi pi-building'],
  ['energia', 'pi pi-bolt'],
  ['luz', 'pi pi-bolt'],
  ['internet', 'pi pi-wifi'],
  ['telefon', 'pi pi-phone'],
  ['celular', 'pi pi-mobile'],
  ['cartao', 'pi pi-credit-card'],
  ['credito', 'pi pi-credit-card'],
  ['transporte', 'pi pi-car'],
  ['carro', 'pi pi-car'],
  ['veiculo', 'pi pi-car'],
  ['combust', 'pi pi-car'],
  ['mercado', 'pi pi-shopping-cart'],
  ['aliment', 'pi pi-shopping-cart'],
  ['compra', 'pi pi-shopping-cart'],
  ['saude', 'pi pi-heart'],
  ['educa', 'pi pi-graduation-cap'],
  ['escola', 'pi pi-graduation-cap'],
  ['curso', 'pi pi-book'],
  ['salario', 'pi pi-briefcase'],
  ['trabalho', 'pi pi-briefcase'],
  ['presente', 'pi pi-gift'],
  ['imposto', 'pi pi-receipt'],
  ['juros', 'pi pi-percentage'],
  ['investimento', 'pi pi-chart-line'],
  ['logistic', 'pi pi-truck'],
  ['frete', 'pi pi-truck'],
  ['debito', 'pi pi-sync'],
  ['assinatura', 'pi pi-sync'],
  ['lazer', 'pi pi-ticket'],
  ['viage', 'pi pi-globe'],
  ['pet', 'pi pi-heart'],
  ['manutencao', 'pi pi-wrench'],
  ['seguro', 'pi pi-shield'],
  ['conta', 'pi pi-receipt'],
  ['receita', 'pi pi-money-bill'],
];

const ICONE_PADRAO = 'pi pi-wallet';

function chaveDaCategoria(nome: string | null | undefined): string {
  return (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function iconeDaCategoria(nome: string | null | undefined): string {
  const chave = chaveDaCategoria(nome);
  if (!chave) return ICONE_PADRAO;
  return ICONES_POR_PALAVRA.find(([palavra]) => chave.includes(palavra))?.[1] ?? ICONE_PADRAO;
}

/** O que outras telas precisam da categoria para desenhar o ícone (Contas a Pagar cruza pelo categoriaId). */
export interface AparenciaCategoria {
  natureza: number | null;
  icone?: string | null;
  cor?: string | null;
}

export function aparenciaDe(categoria: { naturezaOperacao: number; icone?: string | null; cor?: string | null }): AparenciaCategoria {
  return { natureza: categoria.naturezaOperacao, icone: categoria.icone ?? null, cor: categoria.cor ?? null };
}

/** Ícone da categoria: o escolhido no cadastro (card #23) ou, sem escolha, o do nome. */
export function iconeDe(categoria: { icone?: string | null; nome?: string | null } | null | undefined): string {
  return categoria?.icone || iconeDaCategoria(categoria?.nome);
}
