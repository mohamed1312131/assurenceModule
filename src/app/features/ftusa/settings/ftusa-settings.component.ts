import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InsuranceCompany } from '../../../models/insurance-company.model';
import { ActCategory, ActCategoryMetadata, PlatformSettings } from '../../../models/shared.model';

const REQUIRED_PRIOR_AUTH: ActCategory[] = ['CHIRURGIE', 'HOSPITALISATION'];

@Component({
  selector: 'app-ftusa-settings',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './ftusa-settings.component.html',
  styleUrl: './ftusa-settings.component.scss',
})
export class FtusaSettingsComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly companies = signal<InsuranceCompany[]>([]);
  protected readonly categories = signal<ActCategoryMetadata[]>([]);
  protected readonly settings = signal<PlatformSettings>({
    legalAutoApprovalDays: 15,
    mandatoryPriorAuthCategories: REQUIRED_PRIOR_AUTH,
    minimumMarketSlaDays: 10,
  });
  protected readonly newCompanyName = signal('');
  protected readonly newCompanyCode = signal('');

  ngOnInit(): void {
    this.companies.set(this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []));
    this.categories.set(this.readJson<ActCategoryMetadata[]>('omnicare_ftusa_act_categories', []));
    this.settings.set(
      this.readJson<PlatformSettings>('omnicare_ftusa_platform_settings', this.settings()),
    );
    this.ensurePriorAuthFloor();
  }

  protected addCompany(): void {
    const name = this.newCompanyName().trim();
    const code = this.newCompanyCode().trim().toUpperCase();

    if (!name || !code) {
      return;
    }

    const company: InsuranceCompany = {
      address: 'Tunis',
      cgaRegistrationNumber: `CGA-${code}-2026`,
      code,
      contactEmail: `contact@${code.toLowerCase()}.tn`,
      contactPhone: '+216 71 000 000',
      id: code.toLowerCase(),
      inpdpDeclarationNumber: `INPDP-${code}-2026`,
      logoUrl: `/assets/logos/${code.toLowerCase()}.svg`,
      name,
      onboardedAt: new Date().toISOString(),
      onboardingCompleted: false,
      participatesInCrossFraudDetection: false,
      participatesInMarketAnalytics: false,
      status: 'EN_ATTENTE',
    };
    const next = [...this.companies(), company];
    this.companies.set(next);
    this.persist('omnicare_ftusa_companies', next);
    this.newCompanyName.set('');
    this.newCompanyCode.set('');
    this.snackBar.open('Compagnie ajoutée à la liste FTUSA', 'Fermer', { duration: 3000 });
  }

  protected toggleCompany(company: InsuranceCompany): void {
    const nextStatus: InsuranceCompany['status'] =
      company.status === 'SUSPENDUE' ? 'EN_ATTENTE' : 'SUSPENDUE';
    const next = this.companies().map((item) =>
      item.id === company.id ? { ...item, status: nextStatus } : item,
    );
    this.companies.set(next);
    this.persist('omnicare_ftusa_companies', next);
  }

  protected renameCategory(category: ActCategoryMetadata): void {
    const label = window.prompt('Nouveau libellé', category.label)?.trim();

    if (!label) {
      return;
    }

    const next = this.categories().map((item) =>
      item.id === category.id ? { ...item, label } : item,
    );
    this.categories.set(next);
    this.persist('omnicare_ftusa_act_categories', next);
  }

  protected toggleCategory(category: ActCategoryMetadata): void {
    if (REQUIRED_PRIOR_AUTH.includes(category.id)) {
      this.snackBar.open('Chirurgie et hospitalisation sont obligatoires', 'Fermer', {
        duration: 3000,
      });
      return;
    }

    const next = this.categories().map((item) =>
      item.id === category.id ? { ...item, active: !item.active } : item,
    );
    this.categories.set(next);
    this.persist('omnicare_ftusa_act_categories', next);
  }

  protected addCategory(): void {
    const label = window.prompt('Libellé de la nouvelle catégorie')?.trim();

    if (!label) {
      return;
    }

    const id = `AUTRE` as ActCategory;
    const next = [
      ...this.categories(),
      {
        active: true,
        id,
        label,
      },
    ];
    this.categories.set(next);
    this.persist('omnicare_ftusa_act_categories', next);
  }

  protected patchSettings<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ): void {
    this.settings.update((current) => ({ ...current, [key]: value }));
    this.ensurePriorAuthFloor();
  }

  protected saveSettings(): void {
    this.ensurePriorAuthFloor();
    this.persist('omnicare_ftusa_platform_settings', this.settings());
    this.snackBar.open('Paramètres plateforme enregistrés', 'Fermer', { duration: 3000 });
  }

  protected isRequired(category: ActCategory): boolean {
    return REQUIRED_PRIOR_AUTH.includes(category);
  }

  private ensurePriorAuthFloor(): void {
    this.settings.update((current) => ({
      ...current,
      mandatoryPriorAuthCategories: Array.from(
        new Set([...current.mandatoryPriorAuthCategories, ...REQUIRED_PRIOR_AUTH]),
      ),
    }));
  }

  private readJson<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private persist<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }
}
