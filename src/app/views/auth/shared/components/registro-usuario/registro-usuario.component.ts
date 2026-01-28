import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-registro-usuario',
  templateUrl: './registro-usuario.component.html',
  styleUrls: ['./registro-usuario.component.scss'],
})
export class RegistroUsuarioComponent {
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.closeModal.emit();
  }
}
