export enum Status {
    Ativo = 0,
    Inativo = 1
}

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
