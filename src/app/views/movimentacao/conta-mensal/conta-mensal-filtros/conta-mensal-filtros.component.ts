import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-conta-mensal-filtros',
  templateUrl: './conta-mensal-filtros.component.html',
  styleUrls: ['./conta-mensal-filtros.component.scss']
})
export class ContaMensalFiltrosComponent {
  @Input() statusOptions: string[] = [];
  @Input() status = '';
  @Input() from = '';
  @Input() to = '';

  @Output() filtersChange = new EventEmitter<{ status: string; from: string; to: string }>();
  @Output() clearAll = new EventEmitter<void>();

  emitChange(next?: Partial<{ status: string; from: string; to: string }>) {
    const merged = { status: this.status, from: this.from, to: this.to, ...next };
    this.filtersChange.emit(merged);
  }
}