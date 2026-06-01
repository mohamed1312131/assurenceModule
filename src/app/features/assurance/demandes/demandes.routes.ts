import { Routes } from '@angular/router';

import { DemandeDetailPlaceholderComponent } from './demande-detail-placeholder.component';
import { DemandesComponent } from './demandes.component';

export const DEMANDES_ROUTES: Routes = [
  {
    path: '',
    component: DemandesComponent,
  },
  {
    path: ':id',
    component: DemandeDetailPlaceholderComponent,
  },
];
