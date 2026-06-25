import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../../core/auth/auth.service';
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
const DOCUMENT_SIGNATURE_KEY = 'assurance.documentSignatureBase64';
const DOCUMENT_SIGNATURE_META_KEY = 'assurance.documentSignatureMeta';
const MAX_SIGNATURE_SIZE_BYTES = 1024 * 1024;
const ACCEPTED_SIGNATURE_TYPES = ['image/png', 'image/jpeg'];

interface DocumentSignatureMeta {
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
}

@Component({
  selector: 'app-assurance-configuration',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './assurance-configuration.component.html',
  styleUrl: './assurance-configuration.component.scss',
})
export class AssuranceConfigurationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly planTiers = signal<PlanTier[]>([]);
  protected readonly company = signal<InsuranceCompany | null>(null);
  protected readonly settings = signal<CompanySettings | null>(null);
  protected readonly documentSignatureBase64 = signal<string | null>(null);
  protected readonly documentSignatureMeta = signal<DocumentSignatureMeta | null>(null);
  protected readonly documentSignatureError = signal('');
  protected readonly actCategories = ACT_CATEGORIES;
  protected readonly activePlansCount = computed(() => this.planTiers().length);
  protected readonly averageSlaTarget = computed(() => {
    const plans = this.planTiers();

    if (plans.length === 0) {
      return this.settings()?.defaultSlaDays ?? 0;
    }

    const total = plans.reduce((sum, plan) => sum + plan.slaTargetDays, 0);

    return Math.round(total / plans.length);
  });
  protected readonly priorAuthLabels = computed(() =>
    (this.settings()?.priorAuthCategories ?? []).map((category) => this.actLabel(category)),
  );
  protected readonly coverageRuleCount = computed(() =>
    this.planTiers().reduce((total, plan) => total + plan.coverageRules.length, 0),
  );
  protected readonly maxAutoApproveThreshold = computed(() =>
    Math.max(0, ...this.planTiers().map((plan) => plan.autoApproveThreshold)),
  );
  protected readonly maxReinsuranceThreshold = computed(() =>
    Math.max(0, ...this.planTiers().map((plan) => plan.reinsuranceThreshold)),
  );
  protected readonly overridePolicyItems = [
    'Décision finale administrateur',
    'Motif obligatoire si montant modifié',
    'Motif obligatoire si statut modifié',
    'Justification exceptionnelle pour conflit légal',
    'Validation senior au-dessus d’un seuil',
    'Seuil de validation senior',
  ];

  ngOnInit(): void {
    const companyId = this.companyId();
    this.planTiers.set(this.readJson<PlanTier[]>(this.planKey(companyId), []));
    this.company.set(
      this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []).find(
        (company) => company.id === companyId,
      ) ?? null,
    );
    this.settings.set(this.readJson<CompanySettings | null>(this.settingsKey(companyId), null));
    this.documentSignatureBase64.set(this.readText(DOCUMENT_SIGNATURE_KEY));
    this.documentSignatureMeta.set(
      this.readJson<DocumentSignatureMeta | null>(DOCUMENT_SIGNATURE_META_KEY, null),
    );
  }

  protected openPlanDialog(plan: PlanTier | null = null): void {
    const ref = this.dialog.open(PlanTierDialogComponent, {
      data: { companyId: this.companyId(), plan },
      maxWidth: '94vw',
      panelClass: 'assurance-form-dialog',
      width: 'min(920px, 94vw)',
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

  protected averageCoverage(plan: PlanTier): number {
    if (plan.coverageRules.length === 0) {
      return 0;
    }

    const total = plan.coverageRules.reduce((sum, rule) => sum + rule.coveragePercent, 0);

    return Math.round(total / plan.coverageRules.length);
  }

  protected planPriorAuthLabels(plan: PlanTier): string {
    if (plan.requiresPriorAuth.length === 0) {
      return 'Aucun acte configuré';
    }

    return plan.requiresPriorAuth.map((category) => this.actLabel(category)).join(', ');
  }

  protected async uploadDocumentSignature(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.documentSignatureError.set('');

    if (!file) {
      return;
    }

    if (!ACCEPTED_SIGNATURE_TYPES.includes(file.type)) {
      this.documentSignatureError.set('Format non supporté. Utilisez un fichier PNG ou JPG.');
      input.value = '';
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE_BYTES) {
      this.documentSignatureError.set('Fichier trop volumineux. Taille maximale : 1 Mo.');
      input.value = '';
      return;
    }

    const base64 = await this.readFileAsDataUrl(file);
    const validImage = await this.canDecodeImage(base64);

    if (!validImage) {
      this.documentSignatureError.set('Image illisible. Importez un PNG ou JPG valide.');
      input.value = '';
      return;
    }

    const meta: DocumentSignatureMeta = {
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: this.auth.currentUser()?.name ?? 'Administrateur assurance',
    };

    this.documentSignatureBase64.set(base64);
    this.documentSignatureMeta.set(meta);
    this.persistText(DOCUMENT_SIGNATURE_KEY, base64);
    this.persist(DOCUMENT_SIGNATURE_META_KEY, meta);
    input.value = '';
    this.snackBar.open('Signature des documents enregistrée', 'Fermer', { duration: 3000 });
  }

  protected removeDocumentSignature(): void {
    this.documentSignatureBase64.set(null);
    this.documentSignatureMeta.set(null);
    this.documentSignatureError.set('');
    this.removeItem(DOCUMENT_SIGNATURE_KEY);
    this.removeItem(DOCUMENT_SIGNATURE_META_KEY);
    this.snackBar.open('Signature des documents retirée', 'Fermer', { duration: 3000 });
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

    return 'comar';
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

  private readText(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  }

  private persist<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  private persistText(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  }

  private removeItem(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private canDecodeImage(dataUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      image.onerror = () => resolve(false);
      image.src = dataUrl;
    });
  }
}
