import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Moldura das telas de acesso (card #50): login, cadastro, confirmar e-mail, recuperar e redefinir senha.
 * Desktop: painel da marca ao lado do formulário. Tablet e celular: faixa da marca no topo.
 * O conteúdo da tela entra no lugar do formulário. Os estilos comuns dos formulários (título, rótulo,
 * link, senha com cadeado, campos de 48px no celular) ficam aqui, sob a classe .mf-acesso.
 */
@Component({
  selector: 'app-moldura-acesso',
  standalone: true,
  templateUrl: './moldura-acesso.component.html',
  styleUrls: ['./moldura-acesso.component.scss'],
  // Sem encapsulamento: as classes comuns valem para o conteúdo projetado de cada tela.
  encapsulation: ViewEncapsulation.None
})
export class MolduraAcessoComponent {
  readonly ano = new Date().getFullYear();
}
