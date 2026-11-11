import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { parseCurrencyBR } from 'src/app/core/utils/mask';
import { ehReceita, situacao, vencimentoDe } from '../movimentacao/contas-a-pagar/contas-a-pagar.regras';

/** Card #71 — regras puras da Home (só o que é do dia). */

export function saudacao(agora: Date): string {
  const h = agora.getHours();
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
}

export type ContasDoDia = { hoje: LinhaContasMensais[]; amanha: LinhaContasMensais[]; total: number };

/** Despesas em aberto que vencem hoje ou amanhã (as atrasadas ficam no bloco de vencidas), por data. */
export function contasDoDia(contas: LinhaContasMensais[], hoje: Date): ContasDoDia {
  const dia = (c: LinhaContasMensais) => Math.round((vencimentoDe(c).getTime() - inicio(hoje).getTime()) / 86400000);
  const abertas = contas
    .filter(c => !ehReceita(c) && situacao(c, hoje) === 'a-vencer' && dia(c) <= 1)
    .sort((a, b) => dia(a) - dia(b) || a.id - b.id);
  return {
    hoje: abertas.filter(c => dia(c) === 0),
    amanha: abertas.filter(c => dia(c) === 1),
    total: abertas.reduce((s, c) => s + (parseCurrencyBR(c.valor) ?? 0), 0)
  };
}

function inicio(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
