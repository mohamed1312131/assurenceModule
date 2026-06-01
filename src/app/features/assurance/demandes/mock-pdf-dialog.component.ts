import { Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { DocumentType } from '../../../models/request-document.model';
import { ActCategory } from '../../../models/shared.model';

interface MockPdfDialogData {
  docType: DocumentType;
  record: DemandeRemboursement | AutorisationPrealable;
}

interface InvoiceLine {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Component({
  selector: 'app-mock-pdf-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-header no-print">
      <div>
        <p>Document simulé</p>
        <h2>{{ documentTitle() }}</h2>
      </div>
      <div class="dialog-actions">
        <button mat-stroked-button type="button" (click)="print()">
          <mat-icon aria-hidden="true">print</mat-icon>
          Imprimer
        </button>
        <button mat-icon-button type="button" aria-label="Fermer" (click)="close()">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      </div>
    </div>

    <mat-dialog-content>
      <article class="pdf-sheet" id="mock-pdf-sheet">
        <header class="letterhead">
          <div class="logo-block">
            <span>{{ providerInitials() }}</span>
          </div>
          <div>
            <h1>{{ providerName() }}</h1>
            <p>{{ providerTypeLabel() }} · Avenue Habib Bourguiba, {{ providerCity() }}</p>
            <p>Matricule fiscal : MF-{{ providerInitials() }}-2026 · Tél : +216 71 240 240</p>
          </div>
        </header>

        @switch (templateType()) {
          @case ('FACTURE') {
            <section class="document-title">
              <div>
                <span>Facture médicale</span>
                <strong>N° {{ factureNumber() }}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{{ dateLabel(factureDate()) }}</strong>
              </div>
            </section>

            <section class="meta-grid">
              <div>
                <span>Patient</span>
                <strong>{{ patientName() }}</strong>
              </div>
              <div>
                <span>Matricule adhérent</span>
                <strong>{{ memberId() }}</strong>
              </div>
              <div>
                <span>Plan</span>
                <strong>{{ planTierName() }}</strong>
              </div>
              <div>
                <span>Catégorie</span>
                <strong>{{ actCategoryLabel(actCategory()) }}</strong>
              </div>
            </section>

            <table class="line-table">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Qté</th>
                  <th>Prix unitaire</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                @for (line of invoiceLines(); track line.label) {
                  <tr>
                    <td>{{ line.label }}</td>
                    <td>{{ line.quantity }}</td>
                    <td>{{ amountLabel(line.unitPrice) }}</td>
                    <td>{{ amountLabel(line.total) }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <section class="totals">
              <div>
                <span>Sous-total HT</span>
                <strong>{{ amountLabel(subtotalHt()) }}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{{ amountLabel(tvaAmount()) }}</strong>
              </div>
              <div class="grand-total">
                <span>Total TTC</span>
                <strong>{{ amountLabel(totalAmount()) }}</strong>
              </div>
            </section>
          }

          @case ('BULLETIN') {
            <section class="form-title">
              <h2>Bulletin de soins</h2>
              <p>Formulaire médical simulé pour dossier assurance</p>
            </section>

            <section class="boxed-form">
              <h3>Assuré</h3>
              <div class="form-grid">
                <div>
                  <span>Nom et prénom</span>
                  <strong>{{ patientName() }}</strong>
                </div>
                <div>
                  <span>Matricule</span>
                  <strong>{{ memberId() }}</strong>
                </div>
                <div>
                  <span>Police</span>
                  <strong>{{ policyNumber() }}</strong>
                </div>
                <div>
                  <span>Plan</span>
                  <strong>{{ planTierName() }}</strong>
                </div>
              </div>
            </section>

            <section class="boxed-form">
              <h3>Prestataire</h3>
              <div class="form-grid">
                <div>
                  <span>Nom</span>
                  <strong>{{ providerName() }}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{{ providerTypeLabel() }}</strong>
                </div>
                <div>
                  <span>Statut réseau</span>
                  <strong>{{ providerInNetwork() ? 'Réseau agréé' : 'Hors réseau' }}</strong>
                </div>
                <div>
                  <span>Code acte</span>
                  <strong>{{ actCode() }}</strong>
                </div>
              </div>
            </section>

            <section class="boxed-form">
              <h3>Acte et montants</h3>
              <div class="form-grid">
                <div>
                  <span>Catégorie</span>
                  <strong>{{ actCategoryLabel(actCategory()) }}</strong>
                </div>
                <div>
                  <span>Date de l'acte</span>
                  <strong>{{ dateLabel(actDate()) }}</strong>
                </div>
                <div>
                  <span>Montant engagé</span>
                  <strong>{{ amountLabel(totalAmount()) }}</strong>
                </div>
                <div>
                  <span>Part assurance</span>
                  <strong>{{ amountLabel(insuranceShare()) }}</strong>
                </div>
                <div>
                  <span>Part assuré</span>
                  <strong>{{ amountLabel(patientShare()) }}</strong>
                </div>
                <div>
                  <span>Lieu et date</span>
                  <strong>{{ providerCity() }}, le {{ dateLabel(newIsoDate()) }}</strong>
                </div>
              </div>
            </section>
          }

          @default {
            <section class="prescription-head">
              <div>
                <h2>Ordonnance</h2>
                <p>Dr {{ doctorName() }} · {{ doctorSpecialty() }}</p>
                <p>Cabinet médical Les Jardins, {{ providerCity() }} · Ordre des médecins N° OM-{{ providerInitials() }}-4821</p>
              </div>
              <strong>{{ dateLabel(newIsoDate()) }}</strong>
            </section>

            <section class="patient-line">
              <span>Patient</span>
              <strong>{{ patientName() }}</strong>
            </section>

            <section class="prescription-body">
              <h3>Prescription</h3>
              @if (actCategory() === 'KINESITHERAPIE') {
                <ul>
                  <li>10 séances de rééducation fonctionnelle, 3 fois par semaine.</li>
                  <li>Travail progressif de mobilité et renforcement musculaire.</li>
                  <li>Compte rendu d'évolution demandé après la 6e séance.</li>
                </ul>
              } @else {
                <ul>
                  <li>{{ actDescription() }}</li>
                  <li>{{ clinicalJustification() }}</li>
                  <li>Contrôle médical recommandé selon évolution clinique.</li>
                </ul>
              }
            </section>
          }
        }

        <footer class="pdf-footer">
          <div class="stamp-zone">
            <span>Cachet</span>
          </div>
          <div class="signature-zone">
            <span>Signature</span>
          </div>
          <p>Document HTML simulé pour démonstration OmniCare. Aucun document médical réel n'est généré.</p>
        </footer>
      </article>
    </mat-dialog-content>
  `,
  styles: `
    :host {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
    }

    .dialog-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 18px 18px 0;
    }

    .dialog-header p {
      color: var(--omnicare-muted);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin: 0 0 4px;
      text-transform: uppercase;
    }

    .dialog-header h2 {
      color: var(--omnicare-text);
      font-size: 1.35rem;
      margin: 0;
    }

    .dialog-actions {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    mat-dialog-content {
      background: #f4f5f7;
      padding: 22px !important;
    }

    .pdf-sheet {
      background: #ffffff;
      box-shadow: 0 22px 50px rgba(15, 23, 42, 0.16);
      color: #1f2937;
      display: grid;
      gap: 22px;
      margin: 0 auto;
      max-width: 794px;
      min-height: 1040px;
      padding: 48px;
    }

    .letterhead {
      align-items: center;
      border-bottom: 4px solid #1fbf9a;
      display: grid;
      gap: 18px;
      grid-template-columns: auto 1fr;
      padding-bottom: 18px;
    }

    .logo-block {
      align-items: center;
      background: #0f6f73;
      border-radius: 14px;
      color: #ffffff;
      display: flex;
      font-size: 1.3rem;
      font-weight: 800;
      height: 72px;
      justify-content: center;
      width: 72px;
    }

    .letterhead h1 {
      color: #0f6f73;
      font-size: 1.55rem;
      margin: 0 0 6px;
    }

    .letterhead p,
    .pdf-footer p {
      color: #64748b;
      margin: 0;
    }

    .document-title,
    .prescription-head {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .document-title span,
    .meta-grid span,
    .boxed-form span,
    .patient-line span,
    .totals span,
    .pdf-footer span {
      color: #0f6f73;
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .document-title strong {
      color: #111827;
      font-size: 1.15rem;
    }

    .meta-grid,
    .form-grid {
      display: grid;
      gap: 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .meta-grid div,
    .form-grid div {
      border: 1px solid #e5e7eb;
      padding: 12px;
    }

    .meta-grid div:nth-child(4n + 1),
    .meta-grid div:nth-child(4n + 2),
    .form-grid div:nth-child(4n + 1),
    .form-grid div:nth-child(4n + 2),
    .line-table tbody tr:nth-child(odd) {
      background: #f4f5f7;
    }

    .line-table {
      border-collapse: collapse;
      width: 100%;
    }

    .line-table th {
      background: #0f6f73;
      color: #ffffff;
      font-size: 0.78rem;
      padding: 12px;
      text-align: left;
    }

    .line-table td {
      border: 1px solid #e5e7eb;
      padding: 12px;
    }

    .line-table th:nth-child(n + 2),
    .line-table td:nth-child(n + 2) {
      text-align: right;
    }

    .totals {
      border: 1px solid #e5e7eb;
      display: grid;
      gap: 0;
      justify-self: end;
      min-width: 280px;
    }

    .totals div {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
    }

    .grand-total {
      background: #0f6f73;
      color: #ffffff;
    }

    .grand-total span,
    .grand-total strong {
      color: #ffffff;
      margin: 0;
    }

    .form-title {
      background: #f4f5f7;
      border: 2px solid #0f6f73;
      padding: 16px;
      text-align: center;
    }

    .form-title h2,
    .prescription-head h2 {
      color: #0f6f73;
      font-size: 1.45rem;
      margin: 0 0 6px;
    }

    .form-title p,
    .prescription-head p {
      color: #64748b;
      margin: 0;
    }

    .boxed-form {
      border: 2px solid #d8e1e4;
      display: grid;
      gap: 12px;
      padding: 14px;
    }

    .boxed-form h3,
    .prescription-body h3 {
      color: #0f6f73;
      font-size: 1rem;
      margin: 0;
    }

    .prescription-head {
      border-bottom: 2px solid #1fbf9a;
      padding-bottom: 18px;
    }

    .patient-line {
      background: #f4f5f7;
      border-left: 4px solid #1fbf9a;
      padding: 14px;
    }

    .prescription-body {
      border: 1px solid #e5e7eb;
      min-height: 300px;
      padding: 20px;
    }

    .prescription-body ul {
      display: grid;
      gap: 14px;
      margin: 18px 0 0;
      padding-left: 22px;
    }

    .pdf-footer {
      align-self: end;
      border-top: 2px solid #1fbf9a;
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr 1fr;
      padding-top: 18px;
    }

    .stamp-zone,
    .signature-zone {
      border: 1px dashed #94a3b8;
      min-height: 96px;
      padding: 12px;
    }

    .pdf-footer p {
      font-size: 0.78rem;
      grid-column: 1 / -1;
      text-align: center;
    }

    @media print {
      body * {
        visibility: hidden !important;
      }

      #mock-pdf-sheet,
      #mock-pdf-sheet * {
        visibility: visible !important;
      }

      #mock-pdf-sheet {
        box-shadow: none;
        left: 0;
        margin: 0;
        max-width: none;
        min-height: auto;
        position: absolute;
        top: 0;
        width: 100%;
      }

      .no-print {
        display: none !important;
      }
    }
  `,
})
export class MockPdfDialogComponent {
  protected readonly data = inject<MockPdfDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MockPdfDialogComponent>);

  protected readonly invoiceLines = computed(() => this.buildInvoiceLines());
  protected readonly subtotalHt = computed(() => Math.round((this.totalAmount() / 1.07) * 100) / 100);
  protected readonly tvaAmount = computed(() => this.totalAmount() - this.subtotalHt());
  protected readonly insuranceShare = computed(() => Math.round(this.totalAmount() * this.coverageRate()));
  protected readonly patientShare = computed(() => Math.max(0, this.totalAmount() - this.insuranceShare()));

  protected close(): void {
    this.dialogRef.close();
  }

  protected print(): void {
    window.print();
  }

  protected templateType(): 'FACTURE' | 'BULLETIN' | 'ORDONNANCE' {
    if (this.data.docType === 'FACTURE') {
      return 'FACTURE';
    }

    if (this.data.docType === 'BULLETIN_DE_SOINS') {
      return 'BULLETIN';
    }

    return 'ORDONNANCE';
  }

  protected documentTitle(): string {
    switch (this.templateType()) {
      case 'FACTURE':
        return 'Facture';
      case 'BULLETIN':
        return 'Bulletin de soins';
      default:
        return 'Ordonnance';
    }
  }

  protected patientName(): string {
    return this.data.record.patientName;
  }

  protected memberId(): string {
    return this.data.record.patientMemberId;
  }

  protected planTierName(): string {
    return this.data.record.planTierName;
  }

  protected providerName(): string {
    return this.isDemande(this.data.record)
      ? this.data.record.providerName
      : this.data.record.providerName ?? 'Prestataire non renseigné';
  }

  protected providerTypeLabel(): string {
    if (!this.isDemande(this.data.record)) {
      return this.data.record.providerInNetwork ? 'Clinique' : 'Prestataire externe';
    }

    const labels: Record<DemandeRemboursement['providerType'], string> = {
      AUTRE: 'Prestataire médical',
      CLINIQUE: 'Clinique',
      INFIRMIER: 'Infirmier',
      KINE: 'Kinésithérapeute',
      MEDECIN: 'Médecin',
    };

    return labels[this.data.record.providerType];
  }

  protected providerInNetwork(): boolean {
    return this.data.record.providerInNetwork;
  }

  protected providerCity(): string {
    const provider = this.providerName().toLowerCase();

    if (provider.includes('sahel') || provider.includes('sousse')) {
      return 'Sousse';
    }

    if (provider.includes('sfax')) {
      return 'Sfax';
    }

    return 'Tunis';
  }

  protected providerInitials(): string {
    return this.providerName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected factureNumber(): string {
    return this.isDemande(this.data.record)
      ? this.data.record.factureNumber
      : this.data.record.authorizationNumber ?? this.data.record.id;
  }

  protected factureDate(): string {
    return this.isDemande(this.data.record)
      ? this.data.record.factureDate
      : this.data.record.submittedAt.slice(0, 10);
  }

  protected actDate(): string {
    return this.isDemande(this.data.record)
      ? this.data.record.actDate
      : this.data.record.plannedDate ?? this.data.record.submittedAt.slice(0, 10);
  }

  protected actCategory(): ActCategory {
    return this.data.record.actCategory;
  }

  protected actDescription(): string {
    return this.isDemande(this.data.record)
      ? this.data.record.actDescription
      : this.data.record.actType;
  }

  protected clinicalJustification(): string {
    return this.isDemande(this.data.record)
      ? `Prescription liée à ${this.data.record.actDescription.toLowerCase()}.`
      : this.data.record.clinicalJustification;
  }

  protected totalAmount(): number {
    if (this.isDemande(this.data.record)) {
      return this.data.record.totalAmount;
    }

    const estimates: Partial<Record<ActCategory, number>> = {
      CHIRURGIE: 6800,
      HOSPITALISATION: 4200,
      RADIOLOGIE: 650,
      MATERNITE: 2600,
      KINESITHERAPIE: 480,
    };

    return estimates[this.data.record.actCategory] ?? 350;
  }

  protected policyNumber(): string {
    return `POL-${new Date().getFullYear()}-${this.memberId().replace(/[^A-Z0-9]/gi, '').slice(-4)}`;
  }

  protected actCode(): string {
    const codes: Partial<Record<ActCategory, string>> = {
      CHIRURGIE: 'K80',
      CONSULTATION: 'CS',
      DENTAIRE: 'D22',
      HOSPITALISATION: 'H24',
      KINESITHERAPIE: 'K15',
      RADIOLOGIE: 'R40',
      SOINS_INFIRMIERS: 'SI',
    };

    return codes[this.actCategory()] ?? 'C';
  }

  protected doctorName(): string {
    return this.providerName().includes('Trabelsi') ? 'Imen Trabelsi' : 'Nadia Kallel';
  }

  protected doctorSpecialty(): string {
    const category = this.actCategory();

    if (category === 'CHIRURGIE') {
      return 'Chirurgie générale';
    }

    if (category === 'KINESITHERAPIE') {
      return 'Médecine physique';
    }

    if (category === 'RADIOLOGIE') {
      return 'Radiologie';
    }

    return 'Médecine générale';
  }

  protected actCategoryLabel(category: ActCategory): string {
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

  protected amountLabel(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  protected dateLabel(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected newIsoDate(): string {
    return new Date().toISOString();
  }

  private buildInvoiceLines(): InvoiceLine[] {
    const total = this.totalAmount();

    if (this.actCategory() === 'KINESITHERAPIE') {
      const quantity = 6;
      const unitPrice = Math.round(total / quantity);
      const firstTotal = unitPrice * (quantity - 1);

      return [
        {
          label: 'Séances de kinésithérapie',
          quantity: quantity - 1,
          total: firstTotal,
          unitPrice,
        },
        {
          label: 'Séance bilan et suivi',
          quantity: 1,
          total: total - firstTotal,
          unitPrice: total - firstTotal,
        },
      ];
    }

    if (total > 1000) {
      const main = Math.round(total * 0.78);
      const consumables = Math.round(total * 0.12);

      return [
        {
          label: this.actDescription(),
          quantity: 1,
          total: main,
          unitPrice: main,
        },
        {
          label: 'Frais de salle et consommables',
          quantity: 1,
          total: consumables,
          unitPrice: consumables,
        },
        {
          label: 'Suivi post-acte',
          quantity: 1,
          total: total - main - consumables,
          unitPrice: total - main - consumables,
        },
      ];
    }

    return [
      {
        label: this.actDescription(),
        quantity: 1,
        total,
        unitPrice: total,
      },
    ];
  }

  private coverageRate(): number {
    const rates: Partial<Record<ActCategory, number>> = {
      CHIRURGIE: 0.5,
      CONSULTATION: 0.4,
      DENTAIRE: 0.3,
      HOSPITALISATION: 0.55,
      KINESITHERAPIE: 0.4,
      RADIOLOGIE: 0.45,
      SOINS_INFIRMIERS: 0.4,
    };

    return rates[this.actCategory()] ?? 0.35;
  }

  private isDemande(
    record: DemandeRemboursement | AutorisationPrealable,
  ): record is DemandeRemboursement {
    return 'factureNumber' in record;
  }
}
