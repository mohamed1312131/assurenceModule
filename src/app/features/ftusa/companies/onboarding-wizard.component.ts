import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CompagniesFacade } from './compagnies.facade';

interface CompanyForm {
  name: string;
  code: string;
  cgaRegistrationNumber: string;
  inpdpDeclarationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface AdminForm {
  name: string;
  email: string;
  phone: string;
}

interface WizardStep {
  id: 'company' | 'admin' | 'access' | 'activation';
  label: string;
  eyebrow: string;
}

interface AccessModule {
  id:
    | 'assurance-space'
    | 'claims'
    | 'prior-authorizations'
    | 'adherents'
    | 'corporate-contracts'
    | 'provider-network'
    | 'company-settings'
    | 'assurance-analytics'
    | 'fraud-risk';
  title: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-onboarding-wizard',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.scss',
})
export class OnboardingWizardComponent {
  private readonly dialogRef = inject(MatDialogRef<OnboardingWizardComponent>);
  private readonly facade = inject(CompagniesFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly steps: WizardStep[] = [
    {
      eyebrow: 'Identité tenant',
      id: 'company',
      label: 'Informations compagnie',
    },
    {
      eyebrow: 'Accès initial',
      id: 'admin',
      label: 'Compte administrateur',
    },
    {
      eyebrow: 'Modules assureur',
      id: 'access',
      label: 'Droits & accès',
    },
    {
      eyebrow: 'Contrôles finaux',
      id: 'activation',
      label: 'Activation',
    },
  ];
  protected readonly accessModules = signal<AccessModule[]>([
    {
      description: 'Connexion au portail assurance après activation du tenant.',
      enabled: true,
      id: 'assurance-space',
      title: 'Accès espace assureur',
    },
    {
      description: 'Traitement des demandes de remboursement et dossiers courants.',
      enabled: true,
      id: 'claims',
      title: 'Gestion des demandes',
    },
    {
      description: 'Suivi des autorisations médicales avant prise en charge.',
      enabled: true,
      id: 'prior-authorizations',
      title: 'Gestion des autorisations préalables',
    },
    {
      description: 'Référentiel adhérents et données de couverture associées.',
      enabled: true,
      id: 'adherents',
      title: 'Gestion des adhérents',
    },
    {
      description: 'Contrats groupe, entreprises clientes et populations rattachées.',
      enabled: true,
      id: 'corporate-contracts',
      title: 'Gestion des entreprises / contrats groupe',
    },
    {
      description: 'Prestataires, conventions et réseau agréé assurance.',
      enabled: true,
      id: 'provider-network',
      title: 'Réseau agréé',
    },
    {
      description: 'Paramètres compagnie, règles SLA et préférences opérationnelles.',
      enabled: true,
      id: 'company-settings',
      title: 'Configuration compagnie',
    },
    {
      description: 'Indicateurs internes de l’assureur dans son espace dédié.',
      enabled: true,
      id: 'assurance-analytics',
      title: 'Analytique assureur',
    },
    {
      description: 'Analyse des signaux et files de revue fraude côté assureur.',
      enabled: true,
      id: 'fraud-risk',
      title: 'Fraude & risque',
    },
  ]);

  protected readonly currentStep = signal(0);
  protected readonly highestVisitedStep = signal(0);
  protected readonly companyTouched = signal<Partial<Record<keyof CompanyForm, boolean>>>({});
  protected readonly adminTouched = signal<Partial<Record<keyof AdminForm, boolean>>>({});
  protected readonly attemptedSteps = signal<Record<number, boolean>>({});
  protected readonly company = signal<CompanyForm>({
    address: 'Tunis',
    cgaRegistrationNumber: '',
    code: '',
    contactEmail: '',
    contactPhone: '+216 ',
    inpdpDeclarationNumber: '',
    name: '',
  });
  protected readonly admin = signal<AdminForm>({
    email: '',
    name: '',
    phone: '',
  });
  protected readonly fraudOptIn = signal(false);
  protected readonly analyticsOptIn = signal(false);

  protected readonly currentStepInfo = computed(() => this.steps[this.currentStep()]);
  protected readonly isCompanyValid = computed(() => {
    const company = this.company();

    return (
      company.name.trim().length > 0 &&
      company.code.trim().length > 0 &&
      company.contactEmail.trim().length > 0
    );
  });
  protected readonly isAdminValid = computed(() => {
    const admin = this.admin();

    return admin.name.trim().length > 0 && admin.email.trim().length > 0;
  });
  protected readonly enabledModules = computed(() =>
    this.accessModules().filter((module) => module.enabled),
  );

  protected patchCompany<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]): void {
    this.company.update((current) => ({ ...current, [key]: value }));
  }

  protected patchAdmin<K extends keyof AdminForm>(key: K, value: AdminForm[K]): void {
    this.admin.update((current) => ({ ...current, [key]: value }));
  }

  protected markCompanyTouched(field: keyof CompanyForm): void {
    this.companyTouched.update((current) => ({ ...current, [field]: true }));
  }

  protected markAdminTouched(field: keyof AdminForm): void {
    this.adminTouched.update((current) => ({ ...current, [field]: true }));
  }

  protected companyError(field: keyof CompanyForm): string | null {
    if (!this.shouldShowCompanyError(field)) {
      return null;
    }

    const value = this.company()[field].trim();

    if (field === 'name' && !value) {
      return 'Le nom de la compagnie est requis.';
    }

    if (field === 'code' && !value) {
      return 'Le code court est requis.';
    }

    if (field === 'contactEmail' && !value) {
      return 'L’email contact est requis.';
    }

    return null;
  }

  protected adminError(field: keyof AdminForm): string | null {
    if (!this.shouldShowAdminError(field)) {
      return null;
    }

    const value = this.admin()[field].trim();

    if (field === 'name' && !value) {
      return 'Le nom complet de l’administrateur est requis.';
    }

    if (field === 'email' && !value) {
      return 'L’email professionnel est requis.';
    }

    return null;
  }

  protected uppercase(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  protected toggleAccessModule(moduleId: AccessModule['id'], enabled: boolean): void {
    this.accessModules.update((modules) =>
      modules.map((module) => (module.id === moduleId ? { ...module, enabled } : module)),
    );
  }

  protected canOpenStep(index: number): boolean {
    return index <= this.highestVisitedStep();
  }

  protected isStepValid(index: number): boolean {
    if (index === 0) {
      return this.isCompanyValid();
    }

    if (index === 1) {
      return this.isAdminValid();
    }

    return true;
  }

  protected goToStep(index: number): void {
    if (this.canOpenStep(index)) {
      this.currentStep.set(index);
    }
  }

  protected continue(): void {
    const step = this.currentStep();
    this.markStepAttempted(step);

    if (!this.isStepValid(step)) {
      return;
    }

    const nextStep = Math.min(step + 1, this.steps.length - 1);
    this.currentStep.set(nextStep);
    this.highestVisitedStep.update((current) => Math.max(current, nextStep));
  }

  protected back(): void {
    this.currentStep.update((step) => Math.max(step - 1, 0));
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected activate(): void {
    this.markStepAttempted(0);
    this.markStepAttempted(1);

    if (!this.isCompanyValid()) {
      this.currentStep.set(0);
      this.highestVisitedStep.update((current) => Math.max(current, 0));
      return;
    }

    if (!this.isAdminValid()) {
      this.currentStep.set(1);
      this.highestVisitedStep.update((current) => Math.max(current, 1));
      return;
    }

    const companyForm = this.company();
    const adminForm = this.admin();
    const company = this.facade.createTenant({
      adminEmail: adminForm.email.trim(),
      adminName: adminForm.name.trim(),
      company: {
        address: companyForm.address.trim(),
        cgaRegistrationNumber:
          companyForm.cgaRegistrationNumber.trim() || `CGA-${companyForm.code}-2026`,
        code: companyForm.code.trim(),
        contactEmail: companyForm.contactEmail.trim(),
        contactPhone: companyForm.contactPhone.trim(),
        inpdpDeclarationNumber:
          companyForm.inpdpDeclarationNumber.trim() || `INPDP-${companyForm.code}-2026`,
        name: companyForm.name.trim(),
        participatesInCrossFraudDetection: this.fraudOptIn(),
        participatesInMarketAnalytics: this.analyticsOptIn(),
      },
      importedAdherentsCount: 0,
      participatesInCrossFraudDetection: this.fraudOptIn(),
      participatesInMarketAnalytics: this.analyticsOptIn(),
      planTier: this.facade.planFromTemplate('new-company', 'CONFORT'),
    });

    this.snackBar.open(
      `Compagnie ${company.name} activée · email envoyé à l’administrateur (simulation)`,
      'Fermer',
      { duration: 4500 },
    );
    this.dialogRef.close({ created: true });
  }

  private shouldShowCompanyError(field: keyof CompanyForm): boolean {
    return !!this.companyTouched()[field] || !!this.attemptedSteps()[0];
  }

  private shouldShowAdminError(field: keyof AdminForm): boolean {
    return !!this.adminTouched()[field] || !!this.attemptedSteps()[1];
  }

  private markStepAttempted(step: number): void {
    this.attemptedSteps.update((current) => ({ ...current, [step]: true }));

    if (step === 0) {
      this.companyTouched.update((current) => ({
        ...current,
        code: true,
        contactEmail: true,
        name: true,
      }));
    }

    if (step === 1) {
      this.adminTouched.update((current) => ({
        ...current,
        email: true,
        name: true,
      }));
    }
  }
}
