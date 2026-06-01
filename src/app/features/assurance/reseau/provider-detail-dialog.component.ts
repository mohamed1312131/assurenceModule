import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { ProviderNetworkEntry } from '../../../models/provider-network.model';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';

@Component({
  selector: 'app-provider-detail-dialog',
  imports: [MatButtonModule, MatChipsModule, MatDialogModule, StatusChipComponent],
  template: `
    <h2 mat-dialog-title>{{ provider.providerName }}</h2>
    <mat-dialog-content>
      <div class="detail-grid">
        <span>Type</span>
        <strong>{{ providerTypeLabel(provider.providerType) }}</strong>
        <span>Ville</span>
        <strong>{{ provider.city }}</strong>
        <span>Région</span>
        <strong>{{ provider.region }}</strong>
        <span>Statut réseau</span>
        <app-status-chip [status]="provider.networkStatus" />
        <span>Tiers payant</span>
        <strong>{{ provider.tiersPayantEnabled ? 'Activé' : 'Non activé' }}</strong>
        <span>Agréé depuis</span>
        <strong>{{ provider.agreedSince ? formatDate(provider.agreedSince) : 'Non applicable' }}</strong>
        <span>Demandes année</span>
        <strong>{{ provider.claimsThisYear }}</strong>
        <span>Remboursé année</span>
        <strong>{{ formatCurrency(provider.totalReimbursedThisYear) }}</strong>
      </div>

      <section>
        <h3>Spécialités</h3>
        <mat-chip-set aria-label="Spécialités">
          @for (specialty of provider.specialties; track specialty) {
            <mat-chip>{{ specialty }}</mat-chip>
          }
        </mat-chip-set>
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .detail-grid {
      display: grid;
      gap: 12px 18px;
      grid-template-columns: 150px 1fr;
      min-width: min(520px, 78vw);
    }

    span {
      color: var(--omnicare-muted);
    }

    strong {
      color: var(--omnicare-text);
    }

    section {
      margin-top: 22px;
    }

    h3 {
      color: var(--omnicare-text);
      font-size: 1rem;
      margin: 0 0 10px;
    }
  `,
})
export class ProviderDetailDialogComponent {
  protected readonly provider = inject(MAT_DIALOG_DATA) as ProviderNetworkEntry;

  protected providerTypeLabel(type: ProviderNetworkEntry['providerType']): string {
    const labels: Record<ProviderNetworkEntry['providerType'], string> = {
      AUTRE: 'Autre',
      CABINET_DENTAIRE: 'Cabinet dentaire',
      CLINIQUE: 'Clinique',
      INFIRMIER: 'Infirmier',
      KINE: 'Kinésithérapeute',
      LABORATOIRE: 'Laboratoire',
      MEDECIN: 'Médecin',
    };

    return labels[type];
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoDate));
  }
}
