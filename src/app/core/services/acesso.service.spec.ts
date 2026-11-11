import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AcessoService } from './acesso.service';
import { environment } from 'src/environments/environment';

/** Card #50: rotas e corpos dos pedidos de cadastro e recuperação de senha. */
describe('AcessoService', () => {
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('manda cada pedido para a sua rota com o corpo certo', () => {
    const service = TestBed.inject(AcessoService);
    service.cadastrar('Ana', 'ana.lima', 'ana@exemplo.com', 'Senha123').subscribe();
    service.confirmarEmail('t1').subscribe();
    service.reenviarConfirmacao('ana@exemplo.com').subscribe();
    service.esqueciSenha('ana@exemplo.com').subscribe();
    service.redefinirSenha('t2', 'NovaSenha9').subscribe();

    expect(http.expectOne(`${base}/cadastro`).request.body).toEqual({ nome: 'Ana', usuario: 'ana.lima', email: 'ana@exemplo.com', senha: 'Senha123' });
    expect(http.expectOne(`${base}/cadastro/confirmar`).request.body).toEqual({ token: 't1' });
    expect(http.expectOne(`${base}/cadastro/reenviar`).request.body).toEqual({ email: 'ana@exemplo.com' });
    expect(http.expectOne(`${base}/senha/esqueci`).request.body).toEqual({ email: 'ana@exemplo.com' });
    expect(http.expectOne(`${base}/senha/redefinir`).request.body).toEqual({ token: 't2', senha: 'NovaSenha9' });
  });
});
