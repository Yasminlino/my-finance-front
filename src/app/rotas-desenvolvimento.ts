import { Routes } from '@angular/router';

/**
 * Rotas que só existem em desenvolvimento. No build de produção este arquivo é trocado por
 * rotas-desenvolvimento.prod.ts (fileReplacements do angular.json), e o código delas nem entra no pacote.
 */
export const ROTAS_DESENVOLVIMENTO: Routes = [
  // Base de UI para conferência visual (card #27).
  {
    path: 'ui',
    loadComponent: () => import('./views/ui/ui-showcase.component').then(m => m.UiShowcaseComponent),
  },
];
