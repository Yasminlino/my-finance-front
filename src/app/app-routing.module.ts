import { inject, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout/layout.component';

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
      {
        path: 'home',
        loadChildren: () =>
          import('./views/home/home.module').then(m => m.HomeModule),
      },
      {
        path: 'category',
        loadChildren: () =>
          import('./views/cadastro/categoria/categoria.module').then(m => m.CategoriaModule),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('./views/cadastro/conta-mensal/conta-mensal.module').then(m => m.CadastroContaMensalModule),
      },
      {
        path: 'bancos',
        loadChildren: () =>
          import('./views/cadastro/banco/banco.module').then(m => m.BancoModule),
      },
      {
        path: 'tipo-cartao',
        loadChildren: () =>
          import('./views/cadastro/tipo-cartao/tipo-cartao.module').then(m => m.TipoCartaoModule),
      },
      {
        path: 'tipo-movimentacao',
        loadChildren: () =>
          import('./views/cadastro/tipo-movimentacao/tipo-movimentacao.module').then(m => m.TipoMovimentacaoModule),
      },
      {
        path: 'conta-mensal',
        loadChildren: () =>
          import('./views/movimentacao/conta-mensal/conta-mensal.module').then(m => m.ContaMensalModule),
      },
      {
        path: 'extrato-bancario',
        loadChildren: () =>
          import('./views/movimentacao/extrato-bancario/extrato-bancario.module').then(m => m.ExtratoBancarioModule),
      },
      {
        path: 'catalogos-listas',
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
