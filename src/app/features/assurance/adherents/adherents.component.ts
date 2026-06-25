import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Adherent } from '../../../models/adherent.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { ClaimSource } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { AdherentDetailDrawerComponent } from './adherent-detail-drawer.component';
import { AdherentsFacade } from './adherents.facade';

type VerificationStatus = Adherent['verificationStatus'];
type EnrollmentType = Adherent['enrollmentType'];

@Component({
  selector: 'app-adherents',
  imports: [
    AdherentDetailDrawerComponent,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  templateUrl: './adherents.component.html',
  styleUrl: './adherents.component.scss',
})
export class AdherentsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(AdherentsFacade);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly selectedAdherent = signal<Adherent | null>(null);
  protected readonly demandes = signal<DemandeRemboursement[]>([]);

  protected readonly verificationStatuses: VerificationStatus[] = ['EN_ATTENTE', 'VERIFIE', 'REJETE'];
  protected readonly enrollmentTypes: EnrollmentType[] = ['INDIVIDUEL', 'GROUPE'];
  protected readonly sources: ClaimSource[] = ['OMNICARE', 'MANUEL', 'IMPORT_CSV', 'WEBSITE', 'EMAIL', 'AUTRE'];

  protected readonly filtered = this.facade.filtered;
  protected readonly pendingVerification = this.facade.pendingVerification;
  protected readonly activeFilterCount = this.facade.activeFilterCount;

  protected readonly planTiers = computed(() =>
    Array.from(new Set(this.facade.allAdherents().map((adherent) => adherent.planTierName))).sort(
      (left, right) => left.localeCompare(right, 'fr'),
    ),
  );
  protected readonly verifiedCount = computed(
    () => this.facade.allAdherents().filter((adherent) => adherent.verificationStatus === 'VERIFIE').length,
  );
  protected readonly groupCount = computed(
    () => this.facade.allAdherents().filter((adherent) => adherent.enrollmentType === 'GROUPE').length,
  );

  protected readonly statsByMember = computed(() => {
    const stats = new Map<string, { count: number; reimbursed: number }>();
    const currentYear = String(new Date().getFullYear());

    for (const demande of this.demandes()) {
      if (!demande.submittedAt.startsWith(currentYear)) {
        continue;
      }

      const current = stats.get(demande.patientMemberId) ?? { count: 0, reimbursed: 0 };
      stats.set(demande.patientMemberId, {
        count: current.count + 1,
        reimbursed: current.reimbursed + (demande.approvedAmount ?? 0),
      });
    }

    return stats;
  });
  protected readonly totalReimbursedYear = computed(() =>
    Array.from(this.statsByMember().values()).reduce((total, stats) => total + stats.reimbursed, 0),
  );

  ngOnInit(): void {
    const companyId = this.companyId();
    this.facade.loadForCompany(companyId);
    this.demandes.set(this.readJson<DemandeRemboursement[]>(`omnicare_ins_${companyId}_demandes`, []));

    const contractId = this.route.snapshot.queryParamMap.get('contractId');

    if (contractId) {
      this.facade.updateFilter({ contractId });
    }
  }

  protected toggleVerificationStatus(status: VerificationStatus): void {
    const current = this.facade.filters().verificationStatuses;
    this.facade.updateFilter({
      verificationStatuses: current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    });
  }

  protected toggleEnrollmentType(type: EnrollmentType): void {
    const current = this.facade.filters().enrollmentTypes;
    this.facade.updateFilter({
      enrollmentTypes: current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    });
  }

  protected toggleSource(source: ClaimSource): void {
    const current = this.facade.filters().sources;
    this.facade.updateFilter({
      sources: current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    });
  }

  protected setPlanTier(planTier: string | null): void {
    this.facade.updateFilter({ planTier });
  }

  protected setEmployer(value: string): void {
    this.facade.updateFilter({ employer: value.trim() || null });
  }

  protected openDrawer(adherent: Adherent): void {
    this.selectedAdherent.set(adherent);
  }

  protected closeDrawer(): void {
    this.selectedAdherent.set(null);
  }

  protected verify(adherent: Adherent): void {
    this.facade.verify(adherent.id);
    this.snackBar.open(`${adherent.patientName} vérifié avec succès`, 'Fermer', {
      duration: 3000,
    });

    if (this.selectedAdherent()?.id === adherent.id) {
      this.selectedAdherent.set(this.facade.getById(adherent.id) ?? null);
    }
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
  }

  protected sourceLabel(source: ClaimSource): string {
    const labels: Record<ClaimSource, string> = {
      AUTRE: 'Autre',
      EMAIL: 'Email',
      IMPORT_CSV: 'Import CSV',
      MANUEL: 'Manuel',
      OMNICARE: 'OmniCare',
      WEBSITE: 'Site web',
    };

    return labels[source];
  }

  protected verificationLabel(status: VerificationStatus): string {
    const labels: Record<VerificationStatus, string> = {
      EN_ATTENTE: 'En attente',
      REJETE: 'Rejeté',
      VERIFIE: 'Vérifié',
    };

    return labels[status];
  }

  protected enrollmentLabel(type: EnrollmentType): string {
    return type === 'GROUPE' ? 'Groupe' : 'Individuel';
  }

  protected memberStats(membershipId: string): { count: number; reimbursed: number } {
    return this.statsByMember().get(membershipId) ?? { count: 0, reimbursed: 0 };
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
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
}
