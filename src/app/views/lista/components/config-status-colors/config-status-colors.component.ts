import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-config-status-colors',
  templateUrl: './config-status-colors.component.html',
  styleUrls: ['./config-status-colors.component.scss'],
})
export class ConfigStatusColorsComponent implements OnInit {
  @Input() statusOptions: string[] = [];
  @Input() colors: Record<string, string> = {};

  @Output() closed = new EventEmitter<{ reload: boolean; colors?: Record<string, string> }>();

  // cópia editável
  draft: Record<string, string> = {};

  ngOnInit(): void {
    this.draft = { ...this.colors };
    // garante uma cor default se não existir
    this.statusOptions.forEach(s => {
      if (!this.draft[s]) this.draft[s] = '#ffffff';
    });
  }

  close(reload = false) {
    this.closed.emit({ reload });
  }

  save() {
    this.closed.emit({ reload: true, colors: this.draft });
  }

  reset() {
    this.statusOptions.forEach(s => (this.draft[s] = '#ffffff'));
  }
}
