import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RedefinirSenhaComponent } from './redefinir-senha.component';
import { AcessoService } from 'src/app/core/services/acesso.service';

/** Card #50: senha nova pelo link do e-mail. */
describe('RedefinirSenhaComponent', () => {
  let acesso: jasmine.SpyObj<AcessoService>;

  const montar = (token: string | null) => {
    acesso = jasmine.createSpyObj<AcessoService>('AcessoService', ['redefinirSenha']);
    TestBed.configureTestingModule({
      imports: [RedefinirSenhaComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AcessoService, useValue: acesso },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } }
      ]
    });
    const fixture = TestBed.createComponent(RedefinirSenhaComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('salva e vai ao login com o aviso de senha alterada', () => {
    const fixture = montar('abc');
    acesso.redefinirSenha.and.returnValue(of(void 0));
    const navegar = spyOn(TestBed.inject(Router), 'navigate');
    fixture.componentInstance.form.setValue({ senha: 'NovaSenha9', confirmar: 'NovaSenha9' });

    fixture.componentInstance.enviar();

    expect(acesso.redefinirSenha).toHaveBeenCalledWith('abc', 'NovaSenha9');
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'senha-alterada' }, replaceUrl: true });
  });

  it('senha fraca não envia', () => {
    const fixture = montar('abc');
    fixture.componentInstance.form.setValue({ senha: 'fraca', confirmar: 'fraca' });

    fixture.componentInstance.enviar();

    expect(acesso.redefinirSenha).not.toHaveBeenCalled();
  });

  it('link vencido mostra "Pedir outro link"', () => {
    const fixture = montar('velho');
    acesso.redefinirSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Este link expirou ou já foi usado.' } })));
    fixture.componentInstance.form.setValue({ senha: 'NovaSenha9', confirmar: 'NovaSenha9' });

    fixture.componentInstance.enviar();
    fixture.detectChanges();

    expect(fixture.componentInstance.linkInvalido).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pedir outro link');
  });

  it('sem token já mostra o link como inválido', () => {
    expect(montar(null).componentInstance.linkInvalido).toBeTrue();
  });
});
