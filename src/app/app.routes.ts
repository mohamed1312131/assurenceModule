import { Routes } from '@angular/router';

import { assuranceGuard } from './core/guards/assurance.guard';
import { ftusaGuard } from './core/guards/ftusa.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: 'ftusa',
    canActivate: [ftusaGuard],
    loadChildren: () => import('./features/ftusa/ftusa.routes').then((m) => m.FTUSA_ROUTES),
  },
  {
    path: 'assurance/:companyId',
    canActivate: [assuranceGuard],
    loadChildren: () =>
      import('./features/assurance/assurance.routes').then((m) => m.ASSURANCE_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
