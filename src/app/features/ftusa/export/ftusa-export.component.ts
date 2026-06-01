import { Component, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { AlertBannerComponent } from '../../../shared/alert-banner/alert-banner.component';

@Component({
  selector: 'app-ftusa-export',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    AlertBannerComponent,
  ],
  templateUrl: './ftusa-export.component.html',
  styleUrl: './ftusa-export.component.scss',
})
export class FtusaExportComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly companies = signal<InsuranceCompany[]>([]);
  protected readonly allDemandes = signal<DemandeRemboursement[]>([]);
  protected readonly dateFrom = signal<string | null>(null);
  protected readonly dateTo = signal<string | null>(null);
  protected readonly companyId = signal<string>('ALL');
  protected readonly format = signal<'CSV'>('CSV');

  protected readonly scopedDemandes = computed(() =>
    this.allDemandes().filter((demande) => {
      if (this.companyId() !== 'ALL' && demande.companyId !== this.companyId()) {
        return false;
      }

      const submittedDate = demande.submittedAt.slice(0, 10);

      if (this.dateFrom() && submittedDate < this.dateFrom()!) {
        return false;
      }

      if (this.dateTo() && submittedDate > this.dateTo()!) {
        return false;
      }

      return true;
    }),
  );

  protected readonly preview = computed(() => {
    const demandes = this.scopedDemandes();
    const decided = demandes.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT', 'REFUSEE'].includes(
        demande.status,
      ),
    );
    const approved = decided.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
    );
    const refusedAmount = demandes
      .filter((demande) => demande.status === 'REFUSEE')
      .reduce((total, demande) => total + demande.totalAmount, 0);
    const completed = demandes.filter((demande) => demande.respondedAt);
    const delay = completed.reduce(
      (total, demande) =>
        total + this.daysBetween(demande.submittedAt, demande.respondedAt ?? demande.lastUpdatedAt),
      0,
    );

    return {
      approvalRate: decided.length > 0 ? approved.length / decided.length : 0,
      approvedAmount: demandes.reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0),
      averageDelay: completed.length > 0 ? delay / completed.length : 0,
      refusedAmount,
      treated: decided.length,
    };
  });

  ngOnInit(): void {
    const companies = this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []);
    this.companies.set(companies);
    this.allDemandes.set(
      companies.flatMap((company) =>
        this.readJson<DemandeRemboursement[]>(`omnicare_ins_${company.id}_demandes`, []),
      ),
    );
  }

  protected downloadCsv(): void {
    const rows = [
      [
        'id',
        'compagnie',
        'patient',
        'date_soumission',
        'statut',
        'source',
        'montant_total',
        'montant_approuve',
      ],
      ...this.scopedDemandes()
        .slice(0, 50)
        .map((demande) => [
          demande.id,
          this.companyName(demande.companyId),
          demande.patientName,
          demande.submittedAt,
          demande.status,
          demande.source,
          String(demande.totalAmount),
          String(demande.approvedAmount ?? 0),
        ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'extrait-activite-omnicare.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Fichier CSV téléchargé', 'Fermer', { duration: 3000 });
  }

  protected setDateFrom(value: string): void {
    this.dateFrom.set(value || null);
  }

  protected setDateTo(value: string): void {
    this.dateTo.set(value || null);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 1,
      style: 'percent',
    }).format(value);
  }

  private companyName(companyId: string): string {
    return this.companies().find((company) => company.id === companyId)?.name ?? companyId;
  }

  private daysBetween(startIso: string, endIso: string): number {
    return Math.max(
      1,
      Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000),
    );
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
