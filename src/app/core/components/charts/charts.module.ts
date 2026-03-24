import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexChartComponent } from './apex-chart/apex-chart.component';

@NgModule({
  declarations: [ApexChartComponent],
  imports: [CommonModule, NgApexchartsModule],
  exports: [ApexChartComponent],
})
export class ChartsModule {}