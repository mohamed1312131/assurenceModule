import { Injectable, computed, inject, signal } from '@angular/core';

import { AdminAccount } from '../../models/admin-account.model';
import { LocalStorageService, STORAGE_KEYS } from '../storage/local-storage.service';

const DEMO_USERS = {
  ftusa: {
    id: 'admin-ftusa-001',
    role: 'FTUSA_ADMIN',
    name: 'Mohamed Khelifa',
    email: 'ftusa-admin@ftusanet.org',
    status: 'ACTIVE',
  },
  star: {
    id: 'admin-star-001',
    role: 'ASSURANCE_ADMIN',
    companyId: 'star',
    name: 'Ahmed Direche',
    email: 'ahmed.direche@star.com.tn',
    status: 'ACTIVE',
  },
  comar: {
    id: 'admin-comar-001',
    role: 'ASSURANCE_ADMIN',
    companyId: 'comar',
    name: 'Sami Bouzid',
    email: 'sami.bouzid@comar.tn',
    status: 'ACTIVE',
  },
} as const satisfies Record<string, AdminAccount>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(LocalStorageService);
  private readonly currentUserSignal = signal<AdminAccount | null>(
    this.storage.getItem<AdminAccount | null>(STORAGE_KEYS.currentUser, null),
  );

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  loginAsFtusaAdmin(): AdminAccount {
    return this.login(DEMO_USERS.ftusa);
  }

  loginAsStarAdmin(): AdminAccount {
    return this.login(DEMO_USERS.star);
  }

  loginAsComarAdmin(): AdminAccount {
    return this.login(DEMO_USERS.comar);
  }

  login(user: AdminAccount): AdminAccount {
    const hydratedUser: AdminAccount = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    this.currentUserSignal.set(hydratedUser);
    this.storage.setItem(STORAGE_KEYS.currentUser, hydratedUser);

    return hydratedUser;
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.storage.removeItem(STORAGE_KEYS.currentUser);
  }
}
