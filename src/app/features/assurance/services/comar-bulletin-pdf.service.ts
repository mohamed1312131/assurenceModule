import { Injectable } from '@angular/core';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib';

import {
  ComarBulletinData,
  DemandeRemboursement,
  DemandeStatus,
} from '../../../models/demande-remboursement.model';

export type ComarBulletinPdfMode = 'PATIENT_PREFILLED' | 'ASSURANCE_FINAL';

export interface ComarBulletinPdfResult {
  blob: Blob;
  objectUrl: string;
}

interface DrawTextOptions {
  font?: PDFFont;
  color?: ReturnType<typeof rgb>;
  maxLines?: number;
}

interface LegacyComarBulletinData {
  patientFullName?: string;
  patientAddress?: string;
  patientMatricule?: string;
  adherentFullName?: string;
  societyName?: string;
  contractNumber?: string;
  careDate?: string;
  doctorName?: string;
  actDesignation?: string;
  amount?: number;
  fiscalNumber?: string;
  assuranceDecision?: string;
  approvedAmount?: number;
  reimbursementAmount?: number;
  reviewerName?: string;
  reviewedDate?: string;
  dossierReference?: string;
}

const TEMPLATE_URL = 'assets/templates/comar-bulletin-soins.pdf';
const DOCUMENT_SIGNATURE_KEY = 'assurance.documentSignatureBase64';
const DEBUG_COORDINATES = false;
const DEMO_FALLBACK = '—';
const TEXT_COLOR = rgb(0.05, 0.13, 0.24);
const GRID_LABEL_SIZE = 5;

const DEMO_DEFAULTS = {
  identifiantUnique: 'STAR-DEM-002',
  societyName: 'Société El Menzah Services',
  adherentFullName: 'Karim Mansour',
  address: '12 Avenue Habib Bourguiba, Tunis',
  contractNumber: 'STAR-CONTRACT-2026-002',
  matricule: 'KM-321',
  patientFirstName: 'Karim',
  specialistNameAndAddress: 'Centre de Kinésithérapie El Menzah - Dr Sami Ben Ali, Tunis',
  establishmentStamp: 'Clinique El Menzah, Tunis',
  doctorSignatureLabel: 'Dr Sami Ben Ali',
  providerFiscalNumber: 'MF-1458796/A',
  actDate: '16/06/2026',
  actDesignation: 'Kiné - 6 séances',
  actCoefficient: 'K6',
  honorairesAmount: '420 DT',
  ordonnanceDelivered: 'Oui',
  pharmacyOrSupplierStamp: 'Pharmacie Centrale El Menzah',
  invoiceAmount: '420 DT',
  declarationDate: '16/06/2026',
  adherentVisa: 'Karim Mansour',
  employerVisa: 'Société El Menzah Services',
  decisionLabel: 'Accord assurance',
  approvedAmount: '420 DT',
  reimbursementAmount: '336 DT',
  reviewerName: 'Ahmed Direche',
  reviewedDate: '24/06/2026',
} as const;

const COMAR_COORDS = {
  identity: {
    identifiantUnique: { x: 370, y: 538 },
    societyName: { x: 115, y: 512 },
    adherentFullName: { x: 145, y: 502 },
    address: { x: 72, y: 492 },
    contractNumber: { x: 112, y: 482 },
    matricule: { x: 72, y: 472 },
  },
  provider: {
    patientFirstName: { x: 64, y: 418 },
    specialistNameAndAddress: { x: 118, y: 418, maxWidth: 132 },
    establishmentStamp: { x: 264, y: 418, maxWidth: 128 },
  },
  medicalRows: {
    rowStartY: 332,
    rowHeight: 18,
    columns: {
      actDate: { x: 39, maxWidth: 34 },
      actDesignation: { x: 82, maxWidth: 72 },
      doctorSignatureLabel: { x: 166, maxWidth: 42 },
      honorairesAmount: { x: 218, maxWidth: 28 },
      providerFiscalNumber: { x: 256, maxWidth: 38 },
      ordonnanceDelivered: { x: 306, maxWidth: 18 },
      pharmacyOrSupplierStamp: { x: 325, maxWidth: 36 },
      invoiceAmount: { x: 368, maxWidth: 28 },
    },
  },
  dentalRows: {
    rowStartY: 118,
    rowHeight: 11,
    columns: {
      actDate: { x: 500, maxWidth: 38 },
      actDesignation: { x: 548, maxWidth: 78 },
      honorairesAmount: { x: 636, maxWidth: 42 },
      providerFiscalNumber: { x: 688, maxWidth: 48 },
      invoiceAmount: { x: 748, maxWidth: 42 },
    },
  },
  declaration: {
    employerVisa: { x: 625, y: 30 },
    declarationDate: { x: 720, y: 30 },
    adherentVisa: { x: 785, y: 30 },
  },
  assuranceReservedBox: {
    decisionLabel: { x: 65, y: 112 },
    approvedAmount: { x: 65, y: 101 },
    reimbursedAmount: { x: 65, y: 90 },
    reviewerName: { x: 65, y: 79 },
    reviewedDate: { x: 65, y: 68 },
    dossierReference: { x: 65, y: 57 },
    signature: { x: 265, y: 58, width: 95, height: 38 },
    fontSize: 7,
  },
} as const;

@Injectable({ providedIn: 'root' })
export class ComarBulletinPdfService {
  async generate(
    demande: DemandeRemboursement,
    mode: ComarBulletinPdfMode = this.modeForStatus(demande.status),
  ): Promise<ComarBulletinPdfResult> {
    return this.generateComarBulletinPdf(demande, mode);
  }

  async generateComarBulletinPdf(
    demande: DemandeRemboursement,
    mode: ComarBulletinPdfMode,
  ): Promise<ComarBulletinPdfResult> {
    const templateBytes = await this.loadTemplate();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPage(0);
    const data = this.mapDemandeToComarBulletin(demande);

    this.drawIdentity(page, data, font, boldFont);
    this.drawProvider(page, data, font, boldFont);
    if (this.isDentalDemande(demande)) {
      this.drawDentalActRows(page, data.medicalActs, data, font, boldFont);
    } else {
      this.drawMedicalActRows(page, data.medicalActs, data, font, boldFont);
    }
    this.drawDeclaration(page, data, font);

    if (mode === 'ASSURANCE_FINAL' && data.assuranceDecision) {
      this.drawAssuranceDecision(page, data.assuranceDecision, font, boldFont);
      await this.drawDocumentSignature(pdfDoc, page);
    }

    if (DEBUG_COORDINATES) {
      this.drawCoordinateGrid(page, font);
    }

    const bytes = await pdfDoc.save();
    const pdfBuffer = new ArrayBuffer(bytes.byteLength);

    new Uint8Array(pdfBuffer).set(bytes);

    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

    return {
      blob,
      objectUrl: URL.createObjectURL(blob),
    };
  }

  modeForStatus(status: DemandeStatus): ComarBulletinPdfMode {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO'].includes(status)
      ? 'ASSURANCE_FINAL'
      : 'PATIENT_PREFILLED';
  }

  filename(demande: DemandeRemboursement, mode: ComarBulletinPdfMode = 'PATIENT_PREFILLED'): string {
    const suffix = mode === 'ASSURANCE_FINAL' ? 'final-assurance' : 'pre-rempli-patient';

    return `bulletin-soins-comar-${demande.id}-${suffix}.pdf`;
  }

  mapDemandeToComarBulletin(demande: DemandeRemboursement): ComarBulletinData {
    const existing = demande.comarBulletin;
    const legacy = existing as LegacyComarBulletinData | undefined;
    const amount = this.formatDemoAmount(legacy?.amount ?? demande.totalAmount);
    const actDate = this.formatDateValue(existing?.medicalActs?.[0]?.actDate ?? legacy?.careDate ?? demande.actDate);
    const useProviderDemoDefaults =
      !existing?.provider?.specialistNameAndAddress ||
      existing.provider.specialistNameAndAddress === `${demande.providerName}, Tunis`;
    const approvedAmount = this.formatDemoAmount(
      this.parseAmount(existing?.assuranceDecision?.approvedAmount) ??
        legacy?.approvedAmount ??
        this.legacyNumber(demande, 'montantApprouve') ??
        demande.approvedAmount,
      DEMO_DEFAULTS.approvedAmount,
    );
    const reimbursementAmount = this.formatDemoAmount(
      this.parseAmount(existing?.assuranceDecision?.reimbursementAmount) ??
        legacy?.reimbursementAmount ??
        this.legacyNumber(demande, 'montantRembourse') ??
        demande.reimbursementAmount ??
        this.estimatedReimbursementAmount(demande),
      DEMO_DEFAULTS.reimbursementAmount,
    );

    return {
      identity: {
        identifiantUnique: this.value(
          existing?.identity?.identifiantUnique ?? demande.id ?? DEMO_DEFAULTS.identifiantUnique,
        ),
        societyName: this.value(
          existing?.identity?.societyName ??
            legacy?.societyName ??
            demande.employerName ??
            DEMO_DEFAULTS.societyName,
        ),
        adherentFullName: this.value(
          existing?.identity?.adherentFullName ??
            legacy?.adherentFullName ??
            demande.patientName ??
            DEMO_DEFAULTS.adherentFullName,
        ),
        address: this.value(
          existing?.identity?.address ??
            legacy?.patientAddress ??
            this.addressForMember(demande.patientMemberId) ??
            DEMO_DEFAULTS.address,
        ),
        contractNumber: this.value(
          existing?.identity?.contractNumber ??
            legacy?.contractNumber ??
            demande.contractId ??
            DEMO_DEFAULTS.contractNumber,
        ),
        matricule: this.value(
          existing?.identity?.matricule ??
            legacy?.patientMatricule ??
            demande.patientMemberId ??
            DEMO_DEFAULTS.matricule,
        ),
        patientFirstName: this.value(
          existing?.identity?.patientFirstName ??
            this.firstName(legacy?.patientFullName ?? demande.patientName) ??
            DEMO_DEFAULTS.patientFirstName,
        ),
      },
      provider: {
        specialistNameAndAddress: this.value(
          useProviderDemoDefaults
            ? DEMO_DEFAULTS.specialistNameAndAddress
            : existing?.provider?.specialistNameAndAddress,
        ),
        establishmentStamp: this.value(
          useProviderDemoDefaults
            ? DEMO_DEFAULTS.establishmentStamp
            : existing?.provider?.establishmentStamp,
        ),
        doctorSignatureLabel: this.value(
          (useProviderDemoDefaults ? DEMO_DEFAULTS.doctorSignatureLabel : existing?.provider?.doctorSignatureLabel) ??
            legacy?.doctorName ??
            DEMO_DEFAULTS.doctorSignatureLabel,
        ),
        providerFiscalNumber: this.value(
          (useProviderDemoDefaults ? DEMO_DEFAULTS.providerFiscalNumber : existing?.provider?.providerFiscalNumber) ??
            legacy?.fiscalNumber ??
            DEMO_DEFAULTS.providerFiscalNumber,
        ),
      },
      medicalActs: [
        {
          actDate,
          actDesignation: this.value(
            existing?.medicalActs?.[0]?.actDesignation ??
              legacy?.actDesignation ??
              this.demoActLabel(demande.actDescription),
          ),
          actCoefficient: this.value(existing?.medicalActs?.[0]?.actCoefficient ?? DEMO_DEFAULTS.actCoefficient),
          honorairesAmount: this.value(existing?.medicalActs?.[0]?.honorairesAmount ?? amount),
          ordonnanceDelivered: this.value(
            existing?.medicalActs?.[0]?.ordonnanceDelivered ?? DEMO_DEFAULTS.ordonnanceDelivered,
          ),
          invoiceAmount: this.value(existing?.medicalActs?.[0]?.invoiceAmount ?? amount),
        },
      ],
      pharmacy: {
        pharmacyOrSupplierStamp: this.value(
          existing?.pharmacy?.pharmacyOrSupplierStamp ?? DEMO_DEFAULTS.pharmacyOrSupplierStamp,
        ),
      },
      declaration: {
        declarationDate: this.formatDateValue(existing?.declaration?.declarationDate ?? actDate),
        adherentVisa: this.value(
          existing?.declaration?.adherentVisa ?? demande.patientName ?? DEMO_DEFAULTS.adherentVisa,
        ),
        employerVisa: this.value(
          existing?.declaration?.employerVisa ??
            demande.employerName ??
            DEMO_DEFAULTS.employerVisa,
        ),
      },
      assuranceDecision: this.modeForStatus(demande.status) === 'ASSURANCE_FINAL'
        ? {
            label: this.value(
              existing?.assuranceDecision?.label ??
                legacy?.assuranceDecision ??
                this.statusLabel(demande.status),
            ),
            approvedAmount,
            reimbursementAmount,
            reviewerName: this.value(
              existing?.assuranceDecision?.reviewerName ??
                legacy?.reviewerName ??
                demande.respondedBy ??
                DEMO_DEFAULTS.reviewerName,
            ),
            reviewedDate: this.formatDateValue(
              existing?.assuranceDecision?.reviewedDate ??
                legacy?.reviewedDate ??
                demande.respondedAt ??
                DEMO_DEFAULTS.reviewedDate,
            ),
            dossierReference: this.value(
              existing?.assuranceDecision?.dossierReference ??
                legacy?.dossierReference ??
                this.legacyString(demande, 'reference') ??
                demande.id,
            ).toUpperCase(),
          }
        : undefined,
    };
  }

  private async loadTemplate(): Promise<ArrayBuffer> {
    const response = await fetch(TEMPLATE_URL);

    if (!response.ok) {
      throw new Error(`Impossible de charger le modèle PDF COMAR (${response.status})`);
    }

    return response.arrayBuffer();
  }

  private drawIdentity(
    page: PDFPage,
    data: ComarBulletinData,
    font: PDFFont,
    boldFont: PDFFont,
  ): void {
    const coordinates = COMAR_COORDS.identity;

    this.drawSafeText(page, data.identity.identifiantUnique, coordinates.identifiantUnique.x, coordinates.identifiantUnique.y, 7, { font: boldFont });
    this.drawSafeText(page, data.identity.societyName, coordinates.societyName.x, coordinates.societyName.y, 7, { font: boldFont });
    this.drawSafeText(page, data.identity.adherentFullName, coordinates.adherentFullName.x, coordinates.adherentFullName.y, 7, { font: boldFont });
    this.drawSafeText(page, data.identity.address, coordinates.address.x, coordinates.address.y, 7, { font });
    this.drawSafeText(page, data.identity.contractNumber, coordinates.contractNumber.x, coordinates.contractNumber.y, 7, { font });
    this.drawSafeText(page, data.identity.matricule, coordinates.matricule.x, coordinates.matricule.y, 7, { font });
  }

  private drawProvider(
    page: PDFPage,
    data: ComarBulletinData,
    font: PDFFont,
    boldFont: PDFFont,
  ): void {
    const coordinates = COMAR_COORDS.provider;

    this.drawSafeText(page, data.identity.patientFirstName, coordinates.patientFirstName.x, coordinates.patientFirstName.y, 7, { font });
    this.drawWrappedText(
      page,
      data.provider.specialistNameAndAddress,
      coordinates.specialistNameAndAddress.x,
      coordinates.specialistNameAndAddress.y,
      coordinates.specialistNameAndAddress.maxWidth,
      5.6,
      6.2,
      { font: boldFont },
    );
    this.drawWrappedText(
      page,
      data.provider.establishmentStamp,
      coordinates.establishmentStamp.x,
      coordinates.establishmentStamp.y,
      coordinates.establishmentStamp.maxWidth,
      5.6,
      6.2,
      { font },
    );
  }

  private drawMedicalActRows(
    page: PDFPage,
    rows: ComarBulletinData['medicalActs'],
    data: ComarBulletinData,
    font: PDFFont,
    boldFont: PDFFont,
  ): void {
    const table = COMAR_COORDS.medicalRows;

    rows.slice(0, 8).forEach((row, index) => {
      const y = table.rowStartY - index * table.rowHeight;

      this.drawWrappedText(page, row.actDate, table.columns.actDate.x, y, table.columns.actDate.maxWidth, 4.5, 5, { font });
      this.drawWrappedText(
        page,
        this.medicalActCellLabel(row),
        table.columns.actDesignation.x,
        y,
        table.columns.actDesignation.maxWidth,
        4.5,
        5,
        { font },
      );
      this.drawWrappedText(
        page,
        this.doctorCellLabel(data.provider.doctorSignatureLabel),
        table.columns.doctorSignatureLabel.x,
        y,
        table.columns.doctorSignatureLabel.maxWidth,
        4.5,
        5,
        { font: boldFont },
      );
      this.drawSafeText(page, row.honorairesAmount, table.columns.honorairesAmount.x, y, 4.5, { font: boldFont });
      this.drawWrappedText(
        page,
        data.provider.providerFiscalNumber,
        table.columns.providerFiscalNumber.x,
        y,
        table.columns.providerFiscalNumber.maxWidth,
        4.2,
        5,
        { font },
      );
      this.drawSafeText(page, row.ordonnanceDelivered, table.columns.ordonnanceDelivered.x, y, 4.5, { font });
      this.drawWrappedText(
        page,
        data.pharmacy.pharmacyOrSupplierStamp,
        table.columns.pharmacyOrSupplierStamp.x,
        y,
        table.columns.pharmacyOrSupplierStamp.maxWidth,
        4.2,
        4.6,
        { font, maxLines: 3 },
      );
      this.drawSafeText(page, row.invoiceAmount, table.columns.invoiceAmount.x, y, 4.5, { font: boldFont });
    });
  }

  private drawDeclaration(page: PDFPage, data: ComarBulletinData, font: PDFFont): void {
    const coordinates = COMAR_COORDS.declaration;

    this.drawSafeText(page, data.declaration.employerVisa, coordinates.employerVisa.x, coordinates.employerVisa.y, 6, { font });
    this.drawSafeText(page, data.declaration.declarationDate, coordinates.declarationDate.x, coordinates.declarationDate.y, 6, { font });
    this.drawSafeText(page, data.declaration.adherentVisa, coordinates.adherentVisa.x, coordinates.adherentVisa.y, 6, { font });
  }

  private drawDentalActRows(
    page: PDFPage,
    rows: ComarBulletinData['medicalActs'],
    data: ComarBulletinData,
    font: PDFFont,
    boldFont: PDFFont,
  ): void {
    const table = COMAR_COORDS.dentalRows;

    rows.slice(0, 4).forEach((row, index) => {
      const y = table.rowStartY - index * table.rowHeight;

      this.drawWrappedText(page, row.actDate, table.columns.actDate.x, y, table.columns.actDate.maxWidth, 4.2, 4.8, { font });
      this.drawWrappedText(
        page,
        this.medicalActCellLabel(row),
        table.columns.actDesignation.x,
        y,
        table.columns.actDesignation.maxWidth,
        4.2,
        4.8,
        { font },
      );
      this.drawSafeText(page, row.honorairesAmount, table.columns.honorairesAmount.x, y, 4.2, { font: boldFont });
      this.drawWrappedText(
        page,
        data.provider.providerFiscalNumber,
        table.columns.providerFiscalNumber.x,
        y,
        table.columns.providerFiscalNumber.maxWidth,
        4,
        4.6,
        { font },
      );
      this.drawSafeText(page, row.invoiceAmount, table.columns.invoiceAmount.x, y, 4.2, { font: boldFont });
    });
  }

  private drawAssuranceDecision(
    page: PDFPage,
    assuranceDecision: NonNullable<ComarBulletinData['assuranceDecision']>,
    font: PDFFont,
    boldFont: PDFFont,
  ): void {
    const coordinates = COMAR_COORDS.assuranceReservedBox;
    const size = coordinates.fontSize;

    this.drawSafeText(page, `Décision: ${assuranceDecision.label}`, coordinates.decisionLabel.x, coordinates.decisionLabel.y, size, { font: boldFont });
    this.drawSafeText(page, `Montant approuvé: ${assuranceDecision.approvedAmount}`, coordinates.approvedAmount.x, coordinates.approvedAmount.y, size, { font: boldFont });
    this.drawSafeText(page, `Montant remboursé: ${assuranceDecision.reimbursementAmount ?? DEMO_DEFAULTS.reimbursementAmount}`, coordinates.reimbursedAmount.x, coordinates.reimbursedAmount.y, size, { font: boldFont });
    this.drawSafeText(page, `Gestionnaire: ${assuranceDecision.reviewerName}`, coordinates.reviewerName.x, coordinates.reviewerName.y, size, { font });
    this.drawSafeText(page, `Date traitement: ${assuranceDecision.reviewedDate}`, coordinates.reviewedDate.x, coordinates.reviewedDate.y, size, { font });
    this.drawSafeText(page, `Dossier: ${assuranceDecision.dossierReference ?? DEMO_DEFAULTS.identifiantUnique}`, coordinates.dossierReference.x, coordinates.dossierReference.y, size, { font });
  }

  private async drawDocumentSignature(pdfDoc: PDFDocument, page: PDFPage): Promise<void> {
    const signatureDataUrl = this.readDocumentSignature();

    if (!signatureDataUrl) {
      return;
    }

    const signatureImage = await this.embedSignatureImage(pdfDoc, signatureDataUrl);

    if (!signatureImage) {
      return;
    }

    const coordinates = COMAR_COORDS.assuranceReservedBox.signature;

    page.drawImage(signatureImage, {
      x: coordinates.x,
      y: coordinates.y,
      width: coordinates.width,
      height: coordinates.height,
    });
  }

  private drawSafeText(
    page: PDFPage,
    text: string | null | undefined,
    x: number,
    y: number,
    size: number,
    options: DrawTextOptions = {},
  ): void {
    page.drawText(this.value(text), {
      x,
      y,
      size,
      font: options.font,
      color: options.color ?? TEXT_COLOR,
    });
  }

  private drawWrappedText(
    page: PDFPage,
    text: string | null | undefined,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    lineHeight: number,
    options: DrawTextOptions = {},
  ): void {
    const font = options.font;
    const paragraphs = this.value(text).split('\n');
    const lines: string[] = [];
    const maxLines = options.maxLines ?? 2;

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        const nextWidth = font ? font.widthOfTextAtSize(nextLine, size) : nextLine.length * size * 0.45;

        if (nextWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = nextLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    lines.slice(0, maxLines).forEach((line, index) => {
      this.drawSafeText(page, line, x, y - index * lineHeight, size, options);
    });
  }

  private drawCoordinateGrid(page: PDFPage, font: PDFFont): void {
    const { width, height } = page.getSize();

    for (let x = 0; x <= width; x += 50) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, color: rgb(1, 0, 0), opacity: 0.25 });
      page.drawText(`${x}`, { x: x + 2, y: 8, size: GRID_LABEL_SIZE, font, color: rgb(1, 0, 0) });
    }

    for (let y = 0; y <= height; y += 50) {
      page.drawLine({ start: { x: 0, y }, end: { x: width, y }, color: rgb(0, 0, 1), opacity: 0.25 });
      page.drawText(`${y}`, { x: 8, y: y + 2, size: GRID_LABEL_SIZE, font, color: rgb(0, 0, 1) });
    }
  }

  private async embedSignatureImage(
    pdfDoc: PDFDocument,
    dataUrl: string,
  ): Promise<PDFImage | null> {
    const parsed = this.parseImageDataUrl(dataUrl);

    if (!parsed) {
      return null;
    }

    try {
      if (parsed.mimeType === 'image/png') {
        return await pdfDoc.embedPng(parsed.bytes);
      }

      if (parsed.mimeType === 'image/jpeg') {
        return await pdfDoc.embedJpg(parsed.bytes);
      }
    } catch {
      return null;
    }

    return null;
  }

  private parseImageDataUrl(dataUrl: string): { mimeType: 'image/png' | 'image/jpeg'; bytes: Uint8Array } | null {
    const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/i.exec(dataUrl.trim());

    if (!match) {
      return null;
    }

    const mimeType = match[1].toLowerCase() as 'image/png' | 'image/jpeg';

    try {
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      return { mimeType, bytes };
    } catch {
      return null;
    }
  }

  private readDocumentSignature(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(DOCUMENT_SIGNATURE_KEY);
  }

  private value(value: string | null | undefined): string {
    const normalized = value?.replace(/\s+/g, ' ').trim();

    return normalized || DEMO_FALLBACK;
  }

  private firstName(fullName: string | null | undefined): string | undefined {
    return this.value(fullName).split(' ')[0];
  }

  private addressForMember(memberId: string): string | undefined {
    const addresses: Record<string, string> = {
      'AH-789': '12 rue Ibn Khaldoun, Mutuelleville, Tunis',
      'CB-789': 'Avenue Mohamed V, Tunis',
      'FM-908': 'Rue du Lac Biwa, Les Berges du Lac, Tunis',
      'HB-118': 'Rue Ali Belhouane, Bizerte',
      'IT-214': 'Avenue de la Liberte, Tunis',
      'KM-321': DEMO_DEFAULTS.address,
      'LB-442': 'Rue de Marseille, Tunis',
      'NK-220': 'Rue du Lac Victoria, Les Berges du Lac, Tunis',
      'OT-230': 'Rue Ibn Sina, Ariana',
      'RB-351': 'Cite Ennasr 2, Ariana',
      'SBH-112': 'Avenue Hedi Nouira, Sfax',
      'SG-456': 'Cite Ennasr 2, Ariana',
    };

    return addresses[memberId];
  }

  private demoActLabel(actDescription: string): string {
    if (actDescription.toLowerCase().includes('kiné')) {
      return DEMO_DEFAULTS.actDesignation;
    }

    return actDescription || DEMO_DEFAULTS.actDesignation;
  }

  private medicalActCellLabel(row: ComarBulletinData['medicalActs'][number]): string {
    return row.actCoefficient === DEMO_FALLBACK || row.actDesignation.includes(row.actCoefficient)
      ? row.actDesignation
      : `${row.actDesignation}\n${row.actCoefficient}`;
  }

  private doctorCellLabel(label: string): string {
    if (label === DEMO_DEFAULTS.doctorSignatureLabel) {
      return 'Dr Sami\nBen Ali';
    }

    return label;
  }

  private formatDemoAmount(amount?: number, fallback: string = DEMO_DEFAULTS.honorairesAmount): string {
    if (!Number.isFinite(amount)) {
      return fallback;
    }

    return `${Math.round(amount ?? 0)} DT`;
  }

  private estimatedReimbursementAmount(demande: DemandeRemboursement): number | undefined {
    const baseAmount = this.legacyNumber(demande, 'montantApprouve') ?? demande.approvedAmount;

    return Number.isFinite(baseAmount) ? Math.round((baseAmount ?? 0) * 0.8) : undefined;
  }

  private legacyNumber(demande: DemandeRemboursement, key: 'montantApprouve' | 'montantRembourse'): number | undefined {
    const value = (demande as DemandeRemboursement & Record<typeof key, unknown>)[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private legacyString(demande: DemandeRemboursement, key: 'reference'): string | undefined {
    const value = (demande as DemandeRemboursement & Record<typeof key, unknown>)[key];

    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private isDentalDemande(demande: DemandeRemboursement): boolean {
    return demande.actCategory === 'DENTAIRE';
  }

  private parseAmount(amount?: string): number | undefined {
    const parsed = Number(amount?.replace(/[^\d.,]/g, '').replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private formatDateValue(value: string | undefined): string {
    const normalized = this.value(value);
    const date = new Date(normalized);

    if (normalized === DEMO_FALLBACK || Number.isNaN(date.getTime())) {
      return normalized === DEMO_FALLBACK ? DEMO_DEFAULTS.actDate : normalized;
    }

    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private statusLabel(status: DemandeStatus): string {
    const labels: Record<DemandeStatus, string> = {
      APPROUVEE: 'Accord assurance',
      APPROUVEE_AUTO: 'Accord assurance automatique',
      APPROUVEE_PARTIELLEMENT: 'Accord partiel assurance',
      DOCUMENTS_INCOMPLETS: 'Documents incomplets',
      EN_EXAMEN: 'En examen',
      REFUSEE: 'Refusée',
      SOUMISE: 'Soumise',
    };

    return labels[status];
  }
}
