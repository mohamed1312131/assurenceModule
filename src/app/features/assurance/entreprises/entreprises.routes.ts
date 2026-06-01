import { Routes } from '@angular/router';

import { EntrepriseDetailComponent } from './entreprise-detail.component';
import { EntreprisesComponent } from './entreprises.component';

export const ENTREPRISES_ROUTES: Routes = [
  {
    path: '',
    component: EntreprisesComponent,
  },
  {
    path: ':id',
    component: EntrepriseDetailComponent,
  },
];
