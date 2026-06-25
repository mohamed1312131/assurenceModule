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
          Promise.all([
            import('./companies/ftusa-companies.component'),
            import('./companies/company-360/company-360.component'),
          ]).then(([companies, company360]) => [
            { path: '', component: companies.FtusaCompaniesComponent },
            { path: ':companyId', component: company360.Company360Component },
          ]),
      },
      {
        path: 'demandes-adhesion',
        redirectTo: 'dashboard',
      },
      {
        path: 'adhesions',
        redirectTo: 'dashboard',
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
