import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { authInterceptor } from './core/interceptors/auth.interceptor';

import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CoreModule,
    LayoutModule,
  ],
  providers: [
    // Token e 401 no interceptor funcional (FE-P2-08).
    provideHttpClient(withInterceptors([authInterceptor])),
    PrimeNGConfig,
    MessageService,
    // Do p-confirmDialog do layout (ConfirmacaoService). Contas a Pagar provê o próprio.
    ConfirmationService
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }