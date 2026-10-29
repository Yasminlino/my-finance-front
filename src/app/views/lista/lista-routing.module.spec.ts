import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

/** /planejamento/:id é a tela única (card #66): as telas por tipo redirecionam para ela. */
describe('Rotas de /planejamento', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([{ path: 'planejamento', loadChildren: () => import('./lista.module').then(m => m.ListaModule) }])
      ]
    });
    router = TestBed.inject(Router);
  });

  ['orcamento', 'checagem', 'cronograma'].forEach(tela => {
    it(`/planejamento/11/${tela} vai para /planejamento/11`, async () => {
      await router.navigateByUrl(`/planejamento/11/${tela}`);

      expect(router.url).toBe('/planejamento/11');
    });
  });
});
