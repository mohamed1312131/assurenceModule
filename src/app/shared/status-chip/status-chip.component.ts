import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

export type StatusChipTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

@Component({
  selector: 'app-status-chip',
  imports: [MatChipsModule],
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.scss',
})
export class StatusChipComponent {
  readonly status = input.required<string>();
  readonly label = input<string | null>(null);
  readonly tone = input<StatusChipTone | null>(null);

  protected readonly displayLabel = computed(() => this.label() ?? this.labelFor(this.status()));
  protected readonly displayTone = computed(() => this.tone() ?? this.toneFor(this.status()));

  private labelFor(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Active',
      ACTIF: 'Actif',
      AGREE: 'Agréé',
      APPROUVEE: 'Approuvée',
      APPROUVEE_AUTO: 'Approuvée automatiquement',
      APPROUVEE_PARTIELLEMENT: 'Approbation partielle',
      DEMANDE: 'Demandé',
      DOCUMENTS_INCOMPLETS: 'Documents incomplets',
      ELEVE: 'Élevé',
      EN_ATTENTE: 'En attente',
      EN_COURS_AGREMENT: 'Agrément en cours',
      EN_EXAMEN: 'En examen',
      EXPIRATION_PROCHE: 'Expiration proche',
      EXPIRE: 'Expiré',
      FAIBLE: 'Faible',
      HORS_RESEAU: 'Hors réseau',
      MANQUANT: 'Manquant',
      MOYEN: 'Moyen',
      RECU: 'Reçu',
      REFUSEE: 'Refusée',
      REJETE: 'Rejeté',
      SOUMISE: 'Soumise',
      SUSPENDED: 'Suspendu',
      SUSPENDU: 'Suspendu',
      SUSPENDUE: 'Suspendue',
      VERIFIE: 'Vérifié',
    };

    return labels[status] ?? this.humanize(status);
  }

  private toneFor(status: string): StatusChipTone {
    if (
      ['ACTIVE', 'ACTIF', 'AGREE', 'APPROUVEE', 'APPROUVEE_AUTO', 'FAIBLE', 'RECU', 'VERIFIE'].includes(
        status,
      )
    ) {
      return 'success';
    }

    if (
      ['DOCUMENTS_INCOMPLETS', 'DEMANDE', 'EN_ATTENTE', 'EN_COURS_AGREMENT', 'EN_EXAMEN', 'EXPIRATION_PROCHE', 'MOYEN'].includes(
        status,
      )
    ) {
      return 'warning';
    }

    if (
      ['ELEVE', 'EXPIRE', 'HORS_RESEAU', 'MANQUANT', 'REFUSEE', 'REJETE', 'SUSPENDED', 'SUSPENDU', 'SUSPENDUE'].includes(
        status,
      )
    ) {
      return 'error';
    }

    if (['APPROUVEE_PARTIELLEMENT', 'SOUMISE'].includes(status)) {
      return 'info';
    }

    return 'neutral';
  }

  private humanize(status: string): string {
    return status
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^\p{L}/u, (firstLetter) => firstLetter.toUpperCase());
  }
}
