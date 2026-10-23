import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { PrimeNGConfig } from 'primeng/api';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    declarations: [AppComponent]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // Os testes de título do gerador procuravam um template que não existe mais (FE-P3-04).
  it('traduz o calendário do PrimeNG para português', () => {
    TestBed.createComponent(AppComponent);
    const config = TestBed.inject(PrimeNGConfig);

    expect(config.getTranslation('monthNames')[0]).toBe('janeiro');
    expect(config.getTranslation('dayNamesMin')).toEqual(['d', 's', 't', 'q', 'q', 's', 's']);
  });
});
