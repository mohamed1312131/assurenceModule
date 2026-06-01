import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InsuranceCompany } from '../../../models/insurance-company.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ActCategory, CompanySettings } from '../../../models/shared.model';
import { PlanTierDialogComponent } from './plan-tier-dialog.component';

const ACT_CATEGORIES: ActCategory[] = [
  'CONSULTATION',
  'CHIRURGIE',
  'KINESITHERAPIE',
  'SOINS_INFIRMIERS',
  'RADIOLOGIE',
  'BIOLOGIE',
  'HOSPITALISATION',
  'DENTAIRE',
  'OPTIQUE',
  'PSYCHIATRIE',
  'MATERNITE',
  'URGENCES',
  'AUTRE',
];

@Component({
  selector: 'app-assurance-configuration',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './assurance-configuration.component.html',
  styleUrl: './assurance-configuration.component.scss',
})
export class AssuranceConfigurationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly planTiers = signal<PlanTier[]>([]);
  protected readonly company = signal<InsuranceCompany | null>(null);
  protected readonly settings = signal<CompanySettings | null>(null);
  protected readonly actCategories = ACT_CATEGORIES;

  ngOnInit(): void {
    const companyId = this.companyId();
    this.planTiers.set(this.readJson<PlanTier[]>(this.planKey(companyId), []));
    this.company.set(
      this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []).find(
        (company) => company.id === companyId,
      ) ?? null,
    );
    this.settings.set(this.readJson<CompanySettings | null>(this.settingsKey(companyId), null));
  }

  protected openPlanDialog(plan: PlanTier | null = null): void {
    const ref = this.dialog.open(PlanTierDialogComponent, {
      data: { companyId: this.companyId(), plan },
      width: '900px',
    });

    ref.afterClosed().subscribe((savedPlan: PlanTier | undefined) => {
      if (!savedPlan) {
        return;
      }

      const exists = this.planTiers().some((item) => item.id === savedPlan.id);
      const next = exists
        ? this.planTiers().map((item) => (item.id === savedPlan.id ? savedPlan : item))
        : [...this.planTiers(), savedPlan];

      this.planTiers.set(next);
      this.persist(this.planKey(this.companyId()), next);
      this.snackBar.open('Plan tarifaire enregistré', 'Fermer', { duration: 3000 });
    });
  }

  protected archivePlan(plan: PlanTier): void {
    const next = this.planTiers().filter((item) => item.id !== plan.id);
    this.planTiers.set(next);
    this.persist(this.planKey(this.companyId()), next);
    this.snackBar.open('Plan archivé', 'Fermer', { duration: 3000 });
  }

  protected patchCompany<K extends keyof InsuranceCompany>(
    key: K,
    value: InsuranceCompany[K],
  ): void {
    this.company.update((company) => (company ? { ...company, [key]: value } : company));
  }

  protected saveCompany(): void {
    const company = this.company();

    if (!company) {
      return;
    }

    const companies = this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []);
    const next = companies.map((item) => (item.id === company.id ? company : item));
    this.persist('omnicare_ftusa_companies', next);
    this.snackBar.open('Profil compagnie enregistré', 'Fermer', { duration: 3000 });
  }

  protected patchSettings<K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K],
  ): void {
    this.settings.update((settings) => (settings ? { ...settings, [key]: value } : settings));
  }

  protected saveSettings(): void {
    const settings = this.settings();

    if (!settings) {
      return;
    }

    this.persist(this.settingsKey(this.companyId()), settings);
    this.snackBar.open('Paramètres compagnie enregistrés', 'Fermer', { duration: 3000 });
  }

  protected actLabel(category: ActCategory): string {
    const labels: Record<ActCategory, string> = {
      AUTRE: 'Autre',
      BIOLOGIE: 'Biologie',
      CHIRURGIE: 'Chirurgie',
      CONSULTATION: 'Consultation',
      DENTAIRE: 'Dentaire',
      HOSPITALISATION: 'Hospitalisation',
      KINESITHERAPIE: 'Kinésithérapie',
      MATERNITE: 'Maternité',
      OPTIQUE: 'Optique',
      PSYCHIATRIE: 'Psychiatrie',
      RADIOLOGIE: 'Radiologie',
      SOINS_INFIRMIERS: 'Soins infirmiers',
      URGENCES: 'Urgences',
    };

    return labels[category];
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  private planKey(companyId: string): string {
    return `omnicare_ins_${companyId}_plan_tiers`;
  }

  private settingsKey(companyId: string): string {
    return `omnicare_ins_${companyId}_settings`;
  }

  private routeCompanyId(): string {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const companyId = currentRoute.snapshot.paramMap.get('companyId');

      if (companyId) {
        return companyId;
      }

      currentRoute = currentRoute.parent;
    }

    return 'star';
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
