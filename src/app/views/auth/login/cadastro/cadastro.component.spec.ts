import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CadastroComponent } from './cadastro.component';
import { AcessoService } from 'src/app/core/services/acesso.service';

/** Card #50: criar conta e a tela "Verifique seu e-mail". */
describe('CadastroComponent', () => {
  let acesso: jasmine.SpyObj<AcessoService>;
  let fixture: ComponentFixture<CadastroComponent>;
  const tela = () => fixture.componentInstance;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    acesso = jasmine.createSpyObj<AcessoService>('AcessoService', ['cadastrar', 'reenviarConfirmacao']);
    TestBed.configureTestingModule({
      imports: [CadastroComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: AcessoService, useValue: acesso }]
    });
    fixture = TestBed.createComponent(CadastroComponent);
    fixture.detectChanges();
  });

  afterEach(() => tela().ngOnDestroy());

  const preencher = (senha = 'Senha123', confirmar = senha) =>
    tela().form.setValue({ nome: ' Ana ', usuario: ' Ana.Lima ', email: ' ana@exemplo.com ', senha, confirmar });

  it('campos vazios não enviam e mostram o erro de cada um', () => {
    tela().enviar();
    fixture.detectChanges();

    expect(acesso.cadastrar).not.toHaveBeenCalled();
    expect(texto()).toContain('Informe seu nome.');
    expect(texto()).toContain('Escolha um nome de usuário.');
    expect(texto()).toContain('Informe seu e-mail.');
    expect(texto()).toContain('Repita a senha.');
  });

  it('senha fraca e confirmação diferente não enviam', () => {
    preencher('fraca', 'outra');
    tela().enviar();

    expect(acesso.cadastrar).not.toHaveBeenCalled();
    expect(tela().erro('senha')).toContain('8 caracteres');
    expect(tela().erro('confirmar')).toBe('As senhas não são iguais.');
  });

  it('nome de usuário fora das regras não envia (card #84)', () => {
    for (const invalido of ['ab', '1ana', 'ana@lima', 'ana lima', 'anã']) {
      preencher();
      tela().form.controls.usuario.setValue(invalido);
      tela().enviar();

      expect(tela().erro('usuario')).withContext(invalido).toContain('de 3 a 30 caracteres');
    }
    expect(acesso.cadastrar).not.toHaveBeenCalled();
  });

  it('nome de usuário já em uso aparece embaixo do campo e some ao mudar', () => {
    acesso.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Este nome de usuário já está em uso. Escolha outro.' }
    })));
    preencher();

    tela().enviar();
    fixture.detectChanges();

    expect(tela().erro('usuario')).toBe('Este nome de usuário já está em uso. Escolha outro.');
    expect(tela().erroApi).toBe('');
    expect(tela().etapa).toBe('formulario');

    tela().form.controls.usuario.setValue('ana.lima2');
    expect(tela().erro('usuario')).toBe('');
  });

  it('os requisitos da senha marcam enquanto digita', () => {
    tela().form.controls.senha.setValue('abc12345');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-requisitos-senha li.ok').length).toBe(3);
  });

  it('cadastra e vira "Verifique seu e-mail" com o reenvio esperando', () => {
    acesso.cadastrar.and.returnValue(of(void 0));
    preencher();

    tela().enviar();
    fixture.detectChanges();

    expect(acesso.cadastrar).toHaveBeenCalledWith('Ana', 'Ana.Lima', 'ana@exemplo.com', 'Senha123');
    expect(tela().etapa).toBe('enviado');
    expect(texto()).toContain('Verifique seu e-mail');
    expect(texto()).toContain('ana@exemplo.com');
    expect(tela().contagem.liberado()).toBeFalse();
  });

  it('erro da API aparece na tela', () => {
    acesso.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Informe um e-mail válido.' } })));
    preencher();

    tela().enviar();

    expect(tela().erroApi).toBe('Informe um e-mail válido.');
    expect(tela().etapa).toBe('formulario');
  });

  it('reenviar manda de novo para o mesmo e-mail', () => {
    acesso.cadastrar.and.returnValue(of(void 0));
    acesso.reenviarConfirmacao.and.returnValue(of(void 0));
    preencher();
    tela().enviar();

    tela().reenviar();

    expect(acesso.reenviarConfirmacao).toHaveBeenCalledWith('ana@exemplo.com');
    expect(tela().reenviado).toBeTrue();
  });
});
