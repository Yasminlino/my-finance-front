import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { ContaMensalRoutingModule } from './conta-mensal-routing.module';
import { ContaMensalFormComponent } from './conta-mensal-form/conta-mensal-form.component';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';
import { ContaLancamentosPainelComponent } from './conta-lancamentos-painel/conta-lancamentos-painel.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';

@NgModule({
  declarations: [
    ContaMensalListComponent
  ],
  imports: [
    ContaMensalFormComponent,
    ContaLancamentosPainelComponent,
    CommonModule,
    FormsModule,
    ContaMensalRoutingModule,
    PageHeaderComponent,
    StatCardComponent,
    FilterBarComponent,
    CategoryIconComponent,
    EmptyStateComponent,
    FabComponent,
    BadgeModule,
    ButtonModule,
    DropdownModule,
    IconFieldModule,
    InputIconModule,
    InputSwitchModule,
    InputTextModule,
    MenuModule,
    MultiSelectModule,
    ProgressBarModule,
    SelectButtonModule,
    SidebarModule,
    TableModule,
    TooltipModule
  ]
})
export class CadastroContaMensalModule { }
