import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/**
 * "Esqueci minha senha" na Parte 1 do card #70: avisa que está chegando. O fluxo de verdade
 * (e-mail com link e redefinição) vem na Parte 2.
 */
@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="flex align-items-center justify-content-center min-h-screen p-3 surface-ground">
      <div class="surface-card shadow-1 border-round p-4 w-full text-center" style="max-width: 25rem">
        <i class="pi pi-envelope text-4xl text-primary mb-3"></i>
        <h1 class="text-2xl font-bold m-0 mb-2">Recuperar senha</h1>
        <p class="text-color-secondary mt-0 mb-4">
          Em breve você vai poder receber um link por e-mail para criar uma senha nova.
          Por enquanto, fale com o suporte.
        </p>
        <p-button label="Voltar para o login" icon="pi pi-arrow-left" [outlined]="true" styleClass="w-full" routerLink="/login" />
      </div>
    </div>
  `
})
export class RecuperarSenhaComponent {}
