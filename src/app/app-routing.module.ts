import { inject, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout/layout.component';
import { ROTAS_ANTIGAS } from './rotas-antigas';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./views/auth/login/login.module').then(m => m.LoginModule),
  },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [() => inject(AuthGuard).canActivate()],
    children: [
      // Endereços antigos primeiro: redirecionam para as rotas em português (FE-P2-12).
      ...ROTAS_ANTIGAS,
      {
        path: 'home',
        loadChildren: () =>
          import('./views/home/home.module').then(m => m.HomeModule),
      },
      {
        path: 'categorias',
        loadChildren: () =>
          import('./views/cadastro/categoria/categoria.module').then(m => m.CategoriaModule),
      },
      {
        path: 'contas',
        loadChildren: () =>
          import('./views/cadastro/conta-mensal/conta-mensal.module').then(m => m.CadastroContaMensalModule),
      },
      {
        path: 'bancos',
        loadChildren: () =>
          import('./views/cadastro/banco/banco.module').then(m => m.BancoModule),
      },
      {
        path: 'tipos-cartao',
        loadChildren: () =>
          import('./views/cadastro/tipo-cartao/tipo-cartao.module').then(m => m.TipoCartaoModule),
      },
      {
        path: 'tipos-movimentacao',
        loadChildren: () =>
          import('./views/cadastro/tipo-movimentacao/tipo-movimentacao.module').then(m => m.TipoMovimentacaoModule),
      },
      {
        path: 'contas-a-pagar',
        loadChildren: () =>
          import('./views/movimentacao/contas-a-pagar/contas-a-pagar.module').then(m => m.ContasAPagarModule),
      },
      {
        path: 'extrato-bancario',
        loadChildren: () =>
          import('./views/movimentacao/extrato-bancario/extrato-bancario.module').then(m => m.ExtratoBancarioModule),
      },
      {
        path: 'listas',
        loadChildren: () =>
          import('./views/lista/lista.module').then(m => m.ListaModule),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },

  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
