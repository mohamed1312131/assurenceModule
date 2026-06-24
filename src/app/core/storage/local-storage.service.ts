import { Injectable } from '@angular/core';

export const STORAGE_KEYS = {
  companies: 'omnicare_ftusa_companies',
  admins: 'omnicare_ftusa_admins',
  communications: 'omnicare_ftusa_communications',
  adhesionRequests: 'omnicare_ftusa_adhesion_requests',
  actCategories: 'omnicare_ftusa_act_categories',
  platformSettings: 'omnicare_ftusa_platform_settings',
  currentUser: 'omnicare_ftusa_current_user',
  seeded: 'omnicare_ftusa_seeded',
} as const;

export type CompanyStorageResource =
  | 'demandes'
  | 'autorisations'
  | 'adherents'
  | 'contracts'
  | 'plan_tiers'
  | 'network'
  | 'settings';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowserStorageAvailable()) {
      return fallback;
    }

    const rawValue = localStorage.getItem(key);

    if (rawValue === null) {
      return fallback;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return fallback;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!this.isBrowserStorageAvailable()) {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    if (!this.isBrowserStorageAvailable()) {
      return;
    }

    localStorage.removeItem(key);
  }

  hasItem(key: string): boolean {
    if (!this.isBrowserStorageAvailable()) {
      return false;
    }

    return localStorage.getItem(key) !== null;
  }

  companyKey(companyId: string, resource: CompanyStorageResource): string {
    return `omnicare_ins_${companyId}_${resource}`;
  }

  private isBrowserStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
