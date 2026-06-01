export interface CorporateContract {
  id: string;
  companyId: string;
  employerName: string;
  employerSector: string;
  hrContactName: string;
  hrContactEmail: string;
  contractStartDate: string;
  contractEndDate: string;
  renewalNoticeDate: string;
  totalEmployees: number;
  enrolledEmployees: number;
  annualPremium: number;
  availablePlanTiers: string[];
  claimsThisYear: number;
  reimbursedThisYear: number;
  claimsRatio: number;
  status: 'ACTIF' | 'EXPIRATION_PROCHE' | 'EXPIRE' | 'SUSPENDU';
}
