export type AdhesionRequestStatus =
  | 'NOUVELLE'
  | 'A_COMPLETER'
  | 'PRETE_A_PROPOSER'
  | 'OFFRE_ENVOYEE'
  | 'CLOTUREE';

export type AdhesionCoverageType =
  | 'SANTE_COMPLEMENTAIRE'
  | 'INCAPACITE_INVALIDITE'
  | 'DECES';

export type AdhesionRelationship = 'ASSURE' | 'CONJOINT' | 'ENFANT';

export interface AdhesionMedicalDeclaration {
  goodHealth: boolean;
  heightCm?: number;
  weightKg?: number;
  currentTreatment?: string;
  chronicDisease?: string;
  surgeryHistory?: string;
  dangerousSport?: string;
  recentWorkStoppage?: string;
  notes?: string;
}

export interface AdhesionMember {
  id: string;
  relationship: AdhesionRelationship;
  fullName: string;
  birthDate: string;
  cin?: string;
  profession?: string;
  medical: AdhesionMedicalDeclaration;
}

export interface AdhesionDocument {
  id: string;
  label: string;
  ownerName?: string;
  required: boolean;
  status: 'RECU' | 'MANQUANT' | 'DEMANDE';
}

export interface AdhesionRequestAction {
  type: 'INFOS_DEMANDEES' | 'OFFRE_ENVOYEE';
  at: string;
  label: string;
}

export interface AdhesionRequest {
  id: string;
  externalRequestId: string;
  source: 'OMNICARE';
  status: AdhesionRequestStatus;
  submittedAt: string;
  updatedAt: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  address: string;
  city: string;
  employerName?: string;
  profession: string;
  annualSalary?: number;
  companyEntryDate?: string;
  familySituation: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
  marriageDate?: string;
  requestedCoverage: AdhesionCoverageType[];
  desiredEffectiveDate: string;
  currentHealthCoverage?: string;
  providentScheme?: string;
  deathBeneficiary?: string;
  members: AdhesionMember[];
  documents: AdhesionDocument[];
  missingItems: string[];
  selectedCompanyId?: string;
  selectedPlanTierName?: string;
  lastAction?: AdhesionRequestAction;
  internalNotes?: string;
}

export interface AdhesionRecommendation {
  companyId: string;
  companyName: string;
  companyCode: string;
  planTierName: string;
  rank: number;
  score: number;
  monthlyPremiumEstimate: number;
  averageCoveragePercent: number;
  slaTargetDays: number;
  reasons: string[];
  cautions: string[];
}
