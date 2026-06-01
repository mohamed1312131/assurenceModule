import { ActCategory } from './shared.model';

export interface PlanTier {
  id: string;
  companyId: string;
  name: string;
  description: string;
  monthlyPremium: number;
  coverageRules: CoverageRule[];
  autoApproveThreshold: number;
  reinsuranceThreshold: number;
  claimFilingDeadlineDays: number;
  slaTargetDays: number;
  requiresPriorAuth: ActCategory[];
}

export interface CoverageRule {
  actCategory: ActCategory;
  coveragePercent: number;
  maxAmountPerClaim?: number;
  maxAmountPerYear?: number;
  notes?: string;
}
