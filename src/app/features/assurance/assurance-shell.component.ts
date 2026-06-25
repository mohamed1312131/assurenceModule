import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { CommunicationsService } from '../../core/communications/communications.service';
import { SeedService } from '../../core/seed/seed.service';

type ShellNavItem = {
  path: string;
  icon: string;
  label: string;
};

@Component({
  selector: 'app-assurance-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './assurance-shell.component.html',
  styleUrl: './assurance-shell.component.scss',
})
export class AssuranceShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seed = inject(SeedService);
  protected readonly comms = inject(CommunicationsService);

  protected readonly user = this.auth.currentUser;
  protected readonly companyId = computed(() => this.user()?.companyId ?? '');
  protected readonly companyLabel = computed(() => this.companyId().toUpperCase() || 'COMAR');
  protected readonly navItems: ShellNavItem[] = [
    { path: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
    { path: 'demandes', icon: 'assignment', label: 'Demandes' },
    { path: 'demandes-adhesion', icon: 'person_add', label: 'Demandes d’adhésion' },
    { path: 'autorisations', icon: 'fact_check', label: 'Autorisations préalables' },
    { path: 'adherents', icon: 'groups', label: 'Adhérents' },
    { path: 'entreprises', icon: 'apartment', label: 'Entreprises' },
    { path: 'reseau', icon: 'local_hospital', label: 'Réseau Agréé' },
    { path: 'fraude', icon: 'shield_lock', label: 'Fraude & Risque' },
    { path: 'configuration', icon: 'tune', label: 'Configuration' },
    { path: 'analytique', icon: 'monitoring', label: 'Analytique' },
    { path: 'communications', icon: 'campaign', label: 'Communications' },
  ];

  protected readonly unreadCount = computed(() =>
    this.companyId() ? this.comms.unreadCount(this.companyId()) : 0,
  );

  ngOnInit(): void {
    this.comms.load();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  protected openCommunications(): void {
    void this.router.navigate(['/assurance', this.companyId(), 'communications']);
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
import { MatBadgeModule } from '@angular/material/badge';
