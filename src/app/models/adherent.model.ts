import { ClaimSource, EmployerReference } from './shared.model';

export interface Adherent {
  id: string;
  companyId: string;
  patientName: string;
  membershipId: string;
  policyNumber: string;
  planTierId: string;
  planTierName: string;
  enrollmentType: 'INDIVIDUEL' | 'GROUPE';
  employer?: EmployerReference;
  verificationStatus: 'EN_ATTENTE' | 'VERIFIE' | 'REJETE';
  enrolledAt: string;
  verifiedAt?: string;
  totalClaimsThisYear: number;
  totalReimbursedThisYear: number;
  source: ClaimSource;
}
