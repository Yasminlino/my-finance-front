import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ConfirmarEmailComponent } from './confirmar-email.component';
import { AcessoService } from 'src/app/core/services/acesso.service';

/** Card #50: o link do e-mail confirma e leva ao login; vencido pede o e-mail para mandar outro. */
describe('ConfirmarEmailComponent', () => {
  let acesso: jasmine.SpyObj<AcessoService>;

  const montar = (token: string | null) => {
    acesso = jasmine.createSpyObj<AcessoService>('AcessoService', ['confirmarEmail', 'reenviarConfirmacao']);
    TestBed.configureTestingModule({
      imports: [ConfirmarEmailComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AcessoService, useValue: acesso },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } }
      ]
    });
    return TestBed.createComponent(ConfirmarEmailComponent);
  };

  it('link válido confirma e vai ao login com o aviso', () => {
    const fixture = montar('abc');
    acesso.confirmarEmail.and.returnValue(of(void 0));
    const navegar = spyOn(TestBed.inject(Router), 'navigate');

    fixture.detectChanges();

    expect(acesso.confirmarEmail).toHaveBeenCalledWith('abc');
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'confirmado' }, replaceUrl: true });
  });

  it('link vencido pede o e-mail e manda outro', () => {
    const fixture = montar('velho');
    acesso.confirmarEmail.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Este link expirou ou já foi usado.' } })));
    acesso.reenviarConfirmacao.and.returnValue(of(void 0));
    fixture.detectChanges();
    const tela = fixture.componentInstance;

    expect(tela.etapa).toBe('invalido');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Link expirado');

    tela.email.setValue('ana@exemplo.com');
    tela.reenviar();

    expect(acesso.reenviarConfirmacao).toHaveBeenCalledWith('ana@exemplo.com');
    expect(tela.etapa).toBe('reenviado');
  });

  it('sem token já mostra o link como inválido, sem chamar a API', () => {
    const fixture = montar(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.etapa).toBe('invalido');
    expect(acesso.confirmarEmail).not.toHaveBeenCalled();
  });

  it('API fora do ar permite tentar de novo', () => {
    const fixture = montar('abc');
    acesso.confirmarEmail.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.detectChanges();

    expect(fixture.componentInstance.etapa).toBe('erro');
    expect(fixture.componentInstance.erroApi).toBe('Não foi possível conectar. Tente novamente em instantes.');
  });
});
