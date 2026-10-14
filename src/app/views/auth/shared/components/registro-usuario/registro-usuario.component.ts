import { Component, EventEmitter, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-registro-usuario',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './registro-usuario.component.html',
})
export class RegistroUsuarioComponent {
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.closeModal.emit();
  }
}
