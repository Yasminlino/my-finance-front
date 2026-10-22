import type { GridColumnOption } from '../components/data-grid/data-grid.interface';

/**
 * Severities aceitas pelo [severity] do p-tag (PrimeNG 17).
 * Declarado como const object (e não enum) para que o tipo seja a união de literais
 * e o strictTemplates valide o binding sem precisar de $any().
 */
export const TagStatus = {
    Secondary: 'secondary',
    Success: 'success',
    Info: 'info',
    Warning: 'warning',
    Danger: 'danger',
    Contrast: 'contrast',
} as const;

export type TagStatus = typeof TagStatus[keyof typeof TagStatus];

/**
 * Status ativo/inativo dos cadastros (Banco, Categoria, Conta).
 * As telas derivam `status` do `ativo` da API como 1 = ativo, 0 = inativo.
 */
export const STATUS_ATIVO_OPTIONS: GridColumnOption[] = [
    { label: 'Ativo', value: 1, classe: TagStatus.Success },
    { label: 'Inativo', value: 0, classe: TagStatus.Secondary }
];

export function statusAtivoLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
}

/** Situação de pagamento dos lançamentos (Contas a Pagar e Extrato). */
export const STATUS_PAGAMENTO_OPTIONS: GridColumnOption[] = [
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Danger },
    { label: 'PAGO NO PRAZO', value: 'PAGO NO PRAZO', classe: TagStatus.Success },
    { label: 'AGUARDANDO', value: 'AGUARDANDO', classe: TagStatus.Info },
    { label: 'PAGO ATRASADO', value: 'PAGO ATRASADO', classe: TagStatus.Warning }
];

const STATUS_PAGOS = ['PAGO NO PRAZO', 'PAGO ATRASADO'];

/** Conta já paga: em Contas a Pagar ela fica bloqueada para edição inline (FE-P2-04). */
export function contaPaga(linha: { situacao?: string }): boolean {
    return STATUS_PAGOS.includes(linha.situacao ?? '');
}
