import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { ClaimFlag } from '../../models/demande-remboursement.model';
import { ClaimSource } from '../../models/shared.model';
import { SourceBadgeComponent } from '../source-badge/source-badge.component';
import { StatusChipComponent } from '../status-chip/status-chip.component';

@Component({
  selector: 'app-claim-card',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  templateUrl: './claim-card.component.html',
  styleUrl: './claim-card.component.scss',
})
export class ClaimCardComponent {
  readonly id = input('');
  readonly patientName = input.required<string>();
  readonly planTierName = input('');
  readonly membershipId = input('');
  readonly employerName = input('');
  readonly actDescription = input('');
  readonly providerName = input('');
  readonly amount = input<number | null>(null);
  readonly source = input<ClaimSource>('AUTRE');
  readonly riskScore = input<'FAIBLE' | 'MOYEN' | 'ELEVE'>('FAIBLE');
  readonly status = input<string | null>(null);
  readonly submittedAt = input<string | null>(null);
  readonly slaLabel = input('');
  readonly flags = input<ClaimFlag[]>([]);
  readonly actionLabel = input('Ouvrir');

  readonly opened = output<string>();

  protected readonly amountLabel = computed(() => {
    const amount = this.amount();

    if (amount === null) {
      return '';
    }

    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount);
  });

  protected readonly patientMeta = computed(() =>
    [this.planTierName(), this.membershipId(), this.employerName()].filter(Boolean).join(' · '),
  );

  protected readonly careLine = computed(() =>
    [this.actDescription(), this.providerName()].filter(Boolean).join(' · '),
  );

  protected readonly submittedLabel = computed(() => {
    const submittedAt = this.submittedAt();

    if (!submittedAt) {
      return '';
    }

    const submittedDate = new Date(submittedAt);
    const diffMs = Date.now() - submittedDate.getTime();
    const diffHours = Math.max(0, Math.floor(diffMs / 3_600_000));

    if (diffHours < 1) {
      return 'Soumise il y a moins d’une heure';
    }

    if (diffHours < 24) {
      return `Soumise il y a ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Soumise il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  });

  protected readonly flagLabels = computed(() =>
    this.flags().map((flag) => ({
      flag,
      label: this.flagLabel(flag),
    })),
  );

  protected onOpen(): void {
    this.opened.emit(this.id());
  }

  private flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai de soumission',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Prestataire hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };

    return labels[flag];
  }
}
