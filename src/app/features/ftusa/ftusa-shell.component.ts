import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { SeedService } from '../../core/seed/seed.service';

type ShellNavItem = {
  path: string;
  icon: string;
  label: string;
};

@Component({
  selector: 'app-ftusa-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './ftusa-shell.component.html',
  styleUrl: './ftusa-shell.component.scss',
})
export class FtusaShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seed = inject(SeedService);

  protected readonly user = this.auth.currentUser;
  protected readonly navItems: ShellNavItem[] = [
    { path: '/ftusa/dashboard', icon: 'dashboard', label: 'Tableau de bord marché' },
    { path: '/ftusa/compagnies', icon: 'domain_add', label: 'Compagnies' },
    { path: '/ftusa/analytique', icon: 'monitoring', label: 'Analytique marché' },
    { path: '/ftusa/fraude', icon: 'shield_lock', label: 'Fraude & Risque' },
    { path: '/ftusa/export', icon: 'download', label: "Export d'activité" },
    { path: '/ftusa/communications', icon: 'campaign', label: 'Communications' },
    { path: '/ftusa/parametres', icon: 'settings', label: 'Paramètres plateforme' },
  ];

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  protected resetDemo(): void {
    const confirmed = window.confirm('Réinitialiser toutes les données de démonstration ?');

    if (!confirmed) {
      return;
    }

    this.seed.resetAndReseed();
    window.location.reload();
  }
}
