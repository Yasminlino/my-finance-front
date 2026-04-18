import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon-progressing',
  templateUrl: './icon-progressing.component.html',
  styleUrls: ['./icon-progressing.component.scss']
})
export class IconProgressingComponent {
  @Input({ required: true }) porcentagem!: number;
  @Input({ required: true }) valorPositivo = true;
  
}
