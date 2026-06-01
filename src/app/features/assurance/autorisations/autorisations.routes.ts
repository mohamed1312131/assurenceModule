import { Routes } from '@angular/router';

import { AutorisationDetailComponent } from './autorisation-detail.component';
import { AutorisationsComponent } from './autorisations.component';

export const AUTORISATIONS_ROUTES: Routes = [
  {
    path: '',
    component: AutorisationsComponent,
  },
  {
    path: ':id',
    component: AutorisationDetailComponent,
  },
];
