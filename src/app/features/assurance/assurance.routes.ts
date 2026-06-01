import { Routes } from '@angular/router';

import { AssuranceShellComponent } from './assurance-shell.component';

export const ASSURANCE_ROUTES: Routes = [
  {
    path: '',
    component: AssuranceShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard.component').then((m) => [
            { path: '', component: m.DashboardComponent },
          ]),
      },
      {
        path: 'demandes',
        loadChildren: () =>
          import('./demandes/demandes.routes').then((m) => m.DEMANDES_ROUTES),
      },
      {
        path: 'autorisations',
        loadChildren: () =>
          import('./autorisations/autorisations.routes').then((m) => m.AUTORISATIONS_ROUTES),
      },
      {
        path: 'adherents',
        loadChildren: () =>
          import('./adherents/adherents.routes').then((m) => m.ADHERENTS_ROUTES),
      },
      {
        path: 'entreprises',
        loadChildren: () =>
          import('./entreprises/entreprises.routes').then((m) => m.ENTREPRISES_ROUTES),
      },
      {
        path: 'reseau',
        loadChildren: () =>
          import('./reseau/assurance-reseau.component').then((m) => [
            { path: '', component: m.AssuranceReseauComponent },
          ]),
      },
      {
        path: 'fraude',
        loadChildren: () =>
          import('./fraude/assurance-fraude.component').then((m) => [
            { path: '', component: m.AssuranceFraudeComponent },
          ]),
      },
      {
        path: 'configuration',
        loadChildren: () =>
          import('./configuration/assurance-configuration.component').then((m) => [
            { path: '', component: m.AssuranceConfigurationComponent },
          ]),
      },
      {
        path: 'analytique',
        loadChildren: () =>
          import('./analytique/assurance-analytique.component').then((m) => [
            { path: '', component: m.AssuranceAnalytiqueComponent },
          ]),
      },
      {
        path: 'communications',
        loadChildren: () =>
          import('./communications/communications.routes').then(
            (m) => m.ASSURANCE_COMMUNICATIONS_ROUTES,
          ),
      },
    ],
  },
];
