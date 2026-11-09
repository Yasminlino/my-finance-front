import { ImportacaoDto } from 'src/app/core/models/extrato.model';

/** Regras puras da tela de Importações realizadas (card #75). */

const CORES = ['roxo', 'azul', 'laranja', 'verde-agua', 'rosa', 'indigo', 'verde', 'vermelho'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA_MS = 86_400_000;
const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** "NuBank" → "Nu"; "Banco do Brasil" → "BB". */
export function siglaDoBanco(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(p => !/^(de|do|da)$/i.test(p));
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase();
  const unica = palavras[0] ?? '';
  return unica.charAt(0).toUpperCase() + unica.charAt(1).toLowerCase();
}

/** A mesma conta tem sempre a mesma cor. */
export function corDoBanco(bancoId: number): string {
  return CORES[Math.abs(bancoId) % CORES.length];
}

/** "2026-10" → "out/2026". */
export function mesCurto(mes: string | null | undefined): string {
  const [ano, numero] = (mes ?? '').split('-').map(Number);
  return ano && numero ? `${MESES[numero - 1].slice(0, 3)}/${ano}` : '—';
}

/** "2026-10" → "OUT": cabeçalho da cobertura. */
export function mesColuna(mes: string): string {
  return MESES[Number(mes.split('-')[1]) - 1].slice(0, 3).toUpperCase();
}

/** "2026-10" → "Outubro de 2026". */
export function mesPorExtenso(mes: string | null | undefined): string {
  const [ano, numero] = (mes ?? '').split('-').map(Number);
  if (!ano || !numero) return 'Sem mês de referência';
  const nome = MESES[numero - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
}

export function dataHora(iso: string): string {
  const d = new Date(iso);
  return `${dataCurta(iso)} · ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(new Date(iso))) / DIA_MS);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 60) return `há ${dias} dias`;
  return `há ${Math.floor(dias / 30)} meses`;
}

/** Filtros do histórico, feitos na tela: o período é que vai à API. */
export function filtrarImportacoes(lista: readonly ImportacaoDto[], busca: string, bancoId: number | null): ImportacaoDto[] {
  const termo = busca.trim().toLowerCase();
  return lista.filter(i => (bancoId === null || i.bancoId === bancoId)
    && (!termo || (i.nomeArquivo ?? '').toLowerCase().includes(termo) || i.bancoNome.toLowerCase().includes(termo)));
}

/** Celular: uma seção por mês de referência, mantendo a ordem da lista. */
export function agruparPorMes(lista: readonly ImportacaoDto[]): { mes: string; itens: ImportacaoDto[] }[] {
  const grupos = new Map<string, ImportacaoDto[]>();
  for (const i of lista) {
    const chave = mesPorExtenso(i.mesReferencia);
    grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
  }
  return [...grupos].map(([mes, itens]) => ({ mes, itens }));
}
