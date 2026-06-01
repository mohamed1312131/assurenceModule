import { RequestDocument } from './request-document.model';
import { ActCategory, ClaimSource } from './shared.model';

export interface AutorisationPrealable {
  id: string;
  companyId: string;
  patientName: string;
  patientMemberId: string;
  planTierName: string;
  employerName?: string;
  actType: string;
  actCategory: ActCategory;
  plannedDate?: string;
  providerName?: string;
  providerInNetwork: boolean;
  clinicalJustification: string;
  source: ClaimSource;
  documents: RequestDocument[];
  status: AutorisationStatus;
  submittedAt: string;
  expiresAt: string;
  respondedAt?: string;
  respondedBy?: string;
  authorizationNumber?: string;
  rejectionReason?: string;
  conditions?: string;
  internalNotes?: string;
}

export type AutorisationStatus =
  | 'EN_ATTENTE'
  | 'EN_EXAMEN'
  | 'APPROUVEE'
  | 'APPROUVEE_AUTO'
  | 'REFUSEE';
