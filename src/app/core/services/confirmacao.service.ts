import { Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface OpcoesConfirmacao {
  /** Título do diálogo (padrão: "Confirmar exclusão"). */
  titulo?: string;
  /** Rótulo do botão de confirmar (padrão: "Excluir"). */
  aceitar?: string;
}

/**
 * Confirmação no diálogo do PrimeNG no lugar do `window.confirm` (FE-P3-04). O diálogo único
 * fica no layout (`p-confirmDialog`); o ConfirmationService é o do root. Contas a Pagar tem o
 * próprio serviço e diálogo, providos na tela.
 *
 * Resolve true ao confirmar; false ao cancelar ou fechar (o PrimeNG chama reject no X e no Esc).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  constructor(private readonly confirmationService: ConfirmationService) {}

  confirmar(mensagem: string, opcoes: OpcoesConfirmacao = {}): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmationService.confirm({
        header: opcoes.titulo ?? 'Confirmar exclusão',
        message: mensagem,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: opcoes.aceitar ?? 'Excluir',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-text p-button-secondary',
        accept: () => resolve(true),
        reject: () => resolve(false)
      });
    });
  }
}
