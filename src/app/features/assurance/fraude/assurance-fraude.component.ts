import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ClaimFlag,
  DemandeRemboursement,
} from '../../../models/demande-remboursement.model';
import { CompanySettings } from '../../../models/shared.model';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';

@Component({
  selector: 'app-assurance-fraude',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    StatusChipComponent,
  ],
  templateUrl: './assurance-fraude.component.html',
  styleUrl: './assurance-fraude.component.scss',
})
export class AssuranceFraudeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly demandes = signal<DemandeRemboursement[]>([]);
  protected readonly settings = signal<CompanySettings | null>(null);

  protected readonly flaggedDemandes = computed(() =>
    this.demandes().filter((demande) => demande.flags.length > 0),
  );

  protected readonly optedIn = computed(
    () => this.settings()?.participatesInCrossFraudDetection ?? false,
  );

  protected readonly kpis = computed(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const flagged = this.flaggedDemandes();
    const confirmed = this.demandes().filter((demande) =>
      demande.internalNotes?.includes('[FRAUDE_CONFIRMEE]'),
    );
    const falsePositives = this.demandes().filter((demande) =>
      demande.internalNotes?.includes('[FAUX_POSITIF]'),
    );

    return {
      confirmed: confirmed.length,
      estimatedSavings: confirmed.reduce((total, demande) => total + demande.totalAmount, 0) * 0.65,
      falsePositives: falsePositives.length,
      flaggedThisMonth: flagged.filter((demande) => demande.submittedAt.startsWith(currentMonth))
        .length,
    };
  });

  ngOnInit(): void {
    const companyId = this.companyId();
    this.demandes.set(this.readJson<DemandeRemboursement[]>(this.demandesKey(companyId), []));
    this.settings.set(this.readJson<CompanySettings | null>(`omnicare_ins_${companyId}_settings`, null));
  }

  protected requestActivation(): void {
    this.snackBar.open('Demande d’activation envoyée à FTUSA (simulation)', 'Fermer', {
      duration: 3500,
    });
  }

  protected markFalsePositive(demande: DemandeRemboursement): void {
    this.updateDemande({
      ...demande,
      flags: [],
      internalNotes: this.appendNote(demande.internalNotes, '[FAUX_POSITIF] Signal classé faux positif.'),
      lastUpdatedAt: new Date().toISOString(),
      riskScore: 'FAIBLE',
    });
    this.snackBar.open('Dossier classé faux positif', 'Fermer', { duration: 3000 });
  }

  protected confirmFraud(demande: DemandeRemboursement): void {
    this.updateDemande({
      ...demande,
      internalNotes: this.appendNote(demande.internalNotes, '[FRAUDE_CONFIRMEE] Fraude confirmée.'),
      lastUpdatedAt: new Date().toISOString(),
      riskScore: 'ELEVE',
    });
    this.snackBar.open('Fraude confirmée et enregistrée', 'Fermer', { duration: 3000 });
  }

  protected investigateProvider(demande: DemandeRemboursement): void {
    const flags = demande.flags.includes('PRESTATAIRE_HORS_RESEAU')
      ? demande.flags
      : [...demande.flags, 'PRESTATAIRE_HORS_RESEAU' as ClaimFlag];
    this.updateDemande({
      ...demande,
      flags,
      internalNotes: this.appendNote(demande.internalNotes, '[INVESTIGATION_PRESTATAIRE] Vérification prestataire ouverte.'),
      lastUpdatedAt: new Date().toISOString(),
    });
    this.snackBar.open('Investigation prestataire ouverte', 'Fermer', { duration: 3000 });
  }

  protected transmitToAlfa(demande: DemandeRemboursement): void {
    if (!this.optedIn()) {
      return;
    }

    this.updateDemande({
      ...demande,
      internalNotes: this.appendNote(demande.internalNotes, '[ALFA] Dossier transmis à ALFA.'),
      lastUpdatedAt: new Date().toISOString(),
    });
    this.snackBar.open('Dossier transmis à ALFA (simulation)', 'Fermer', { duration: 3000 });
  }

  protected anonymizedPatient(demande: DemandeRemboursement): string {
    if (this.optedIn()) {
      return demande.patientName;
    }

    const suffix = demande.patientMemberId.replace(/\D/g, '').slice(-3).padStart(3, '0');
    return `Patient #${suffix}`;
  }

  protected flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai dépassé',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };

    return labels[flag];
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  private updateDemande(updated: DemandeRemboursement): void {
    const next = this.demandes().map((demande) => (demande.id === updated.id ? updated : demande));
    this.demandes.set(next);
    localStorage.setItem(this.demandesKey(this.companyId()), JSON.stringify(next));
  }

  private appendNote(current: string | undefined, note: string): string {
    return [current, note].filter(Boolean).join('\n');
  }

  private demandesKey(companyId: string): string {
    return `omnicare_ins_${companyId}_demandes`;
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
}
