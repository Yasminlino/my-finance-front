import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RecuperarSenhaComponent } from './recuperar-senha.component';
import { AcessoService } from 'src/app/core/services/acesso.service';

/** Card #50: "Esqueci a senha" com mensagem neutra e reenvio a cada 60s. */
describe('RecuperarSenhaComponent', () => {
  let acesso: jasmine.SpyObj<AcessoService>;
  let fixture: ComponentFixture<RecuperarSenhaComponent>;
  const tela = () => fixture.componentInstance;

  beforeEach(() => {
    acesso = jasmine.createSpyObj<AcessoService>('AcessoService', ['esqueciSenha']);
    TestBed.configureTestingModule({
      imports: [RecuperarSenhaComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: AcessoService, useValue: acesso }]
    });
    fixture = TestBed.createComponent(RecuperarSenhaComponent);
    fixture.detectChanges();
  });

  afterEach(() => tela().ngOnDestroy());

  it('e-mail inválido não envia', () => {
    tela().email.setValue('ana');
    tela().enviar();

    expect(acesso.esqueciSenha).not.toHaveBeenCalled();
    expect(tela().erroEmail).toBe('Informe um e-mail válido.');
  });

  it('envia e mostra a mensagem neutra, sem dizer se a conta existe', () => {
    acesso.esqueciSenha.and.returnValue(of(void 0));
    tela().email.setValue(' ana@exemplo.com ');

    tela().enviar();
    fixture.detectChanges();

    expect(acesso.esqueciSenha).toHaveBeenCalledWith('ana@exemplo.com');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Se existir uma conta com');
    expect(texto).toContain('30 minutos');
    expect(tela().contagem.liberado()).toBeFalse();
  });

  it('excesso de pedidos mostra a mensagem da API', () => {
    acesso.esqueciSenha.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 429, error: { message: 'Muitas tentativas. Aguarde um minuto e tente de novo.' }
    })));
    tela().email.setValue('ana@exemplo.com');

    tela().enviar();

    expect(tela().erroApi).toBe('Muitas tentativas. Aguarde um minuto e tente de novo.');
    expect(tela().etapa).toBe('formulario');
  });
});
