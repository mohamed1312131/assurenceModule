import { Routes } from '@angular/router';

import { FtusaShellComponent } from './ftusa-shell.component';

export const FTUSA_ROUTES: Routes = [
  {
    path: '',
    component: FtusaShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/ftusa-dashboard.component').then((m) => [
            { path: '', component: m.FtusaDashboardComponent },
          ]),
      },
      {
        path: 'compagnies',
        loadChildren: () =>
          import('./companies/ftusa-companies.component').then((m) => [
            { path: '', component: m.FtusaCompaniesComponent },
          ]),
      },
      {
        path: 'demandes-adhesion',
        loadChildren: () =>
          import('./adhesion-requests/ftusa-adhesion-requests.component').then((m) => [
            { path: '', component: m.FtusaAdhesionRequestsComponent },
          ]),
      },
      {
        path: 'adhesions',
        redirectTo: 'demandes-adhesion',
      },
      {
        path: 'companies',
        redirectTo: 'compagnies',
      },
      {
        path: 'analytique',
        loadChildren: () =>
          import('./analytics/ftusa-analytics.component').then((m) => [
            { path: '', component: m.FtusaAnalyticsComponent },
          ]),
      },
      {
        path: 'analytics',
        redirectTo: 'analytique',
      },
      {
        path: 'fraude',
        loadChildren: () =>
          import('./fraud/ftusa-fraud.component').then((m) => [
            { path: '', component: m.FtusaFraudComponent },
          ]),
      },
      {
        path: 'fraud',
        redirectTo: 'fraude',
      },
      {
        path: 'export',
        loadChildren: () =>
          import('./export/ftusa-export.component').then((m) => [
            { path: '', component: m.FtusaExportComponent },
          ]),
      },
      {
        path: 'communications',
        loadChildren: () =>
          import('./communications/ftusa-communications.component').then((m) => [
            { path: '', component: m.FtusaCommunicationsComponent },
          ]),
      },
      {
        path: 'parametres',
        loadChildren: () =>
          import('./settings/ftusa-settings.component').then((m) => [
            { path: '', component: m.FtusaSettingsComponent },
          ]),
      },
      {
        path: 'settings',
        redirectTo: 'parametres',
      },
    ],
  },
];
