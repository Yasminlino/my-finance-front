import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Dias de vencimento digitados como "5, 20" → [5, 20], em ordem. Mesmas regras do Cadastro de Contas
 * e da API: cada dia de 1 a 31, sem repetir. Vírgula sobrando no fim é ignorada.
 * Devolve null se algum dia for inválido ou se não houver dia.
 */
export function lerDiasVencimento(texto: unknown): number[] | null {
  const partes = String(texto ?? '')
    .split(',')
    .map(p => p.trim())
    .filter((p, i, todas) => p !== '' || i < todas.length - 1);

  if (partes.length === 0 || partes.some(p => !/^\d+$/.test(p))) return null;

  const dias = partes.map(Number);
  if (dias.some(d => d < 1 || d > 31) || new Set(dias).size !== dias.length) return null;

  return [...dias].sort((a, b) => a - b);
}

/** Campo de dias de vencimento: inválido se lerDiasVencimento recusar o texto. */
export const diasVencimentoValidator: ValidatorFn = (controle: AbstractControl): ValidationErrors | null =>
  lerDiasVencimento(controle.value) ? null : { diasVencimento: true };
