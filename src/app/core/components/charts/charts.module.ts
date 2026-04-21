import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexChartComponent } from './apex-chart/apex-chart.component';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import { IconProgressingComponent } from './icon-progressing/icon-progressing.component';

@NgModule({
  declarations: [ApexChartComponent, PieChartComponent, IconProgressingComponent],
  imports: [CommonModule, NgApexchartsModule],
  exports: [ApexChartComponent, PieChartComponent, IconProgressingComponent],
})
export class ChartsModule {}