import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { AlertBannerComponent } from '../../shared/alert-banner/alert-banner.component';

type DemoProfile = {
  id: 'ftusa' | 'star' | 'comar';
  icon: string;
  title: string;
  description: string;
};

@Component({
  selector: 'app-login',
  imports: [AlertBannerComponent, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly profiles: DemoProfile[] = [
    {
      id: 'ftusa',
      icon: 'account_balance',
      title: 'Connexion FTUSA — Administrateur',
      description: 'Accès complet plateforme',
    },
    {
      id: 'star',
      icon: 'domain',
      title: 'Connexion STAR Assurances — Admin',
      description: 'Tenant STAR avec sections pré-remplies',
    },
    {
      id: 'comar',
      icon: 'business',
      title: 'Connexion COMAR Assurances — Admin',
      description: 'Tenant COMAR pour démontrer le multi-tenant',
    },
  ];

  protected login(profileId: DemoProfile['id']): void {
    if (profileId === 'ftusa') {
      const user = this.auth.loginAsFtusaAdmin();
      this.notifications.success(`Bienvenue ${user.name}`);
      void this.router.navigate(['/ftusa/dashboard']);
      return;
    }

    if (profileId === 'star') {
      const user = this.auth.loginAsStarAdmin();
      this.notifications.success(`Bienvenue ${user.name}`);
      void this.router.navigate(['/assurance', user.companyId, 'dashboard']);
      return;
    }

    const user = this.auth.loginAsComarAdmin();
    this.notifications.success(`Bienvenue ${user.name}`);
    void this.router.navigate(['/assurance', user.companyId, 'dashboard']);
  }
}
