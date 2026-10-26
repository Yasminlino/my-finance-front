import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CategoriaRoutingModule } from './categoria-routing.module';
import { CategoriaListComponent } from './categoria-list/categoria-list.component';
import { CategoriaFormComponent } from './categoria-form/categoria-form.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';

@NgModule({
  declarations: [
    CategoriaListComponent
  ],
  imports: [
    CategoriaFormComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CategoriaRoutingModule,
    PageHeaderComponent,
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
    SelectButtonModule,
    SidebarModule,
    TableModule,
    TagModule,
    TooltipModule
  ]
})
export class CategoriaModule {}
