import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-conta-mensal-header',
  templateUrl: './conta-mensal-header.component.html',
  styleUrls: ['./conta-mensal-header.component.scss']
})
export class ContaMensalHeaderComponent {
  @Input() month = '';
  @Input() showToolbar = false;

  @Output() monthChange = new EventEmitter<string>();
  @Output() toggleToolbar = new EventEmitter<void>();
  @Output() openAddBatch = new EventEmitter<void>();
  @Output() openCreate = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

}
