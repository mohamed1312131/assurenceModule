import { Injectable } from '@angular/core';

import { AdminAccount } from '../../../../models/admin-account.model';
import { Adherent } from '../../../../models/adherent.model';
import { AutorisationPrealable } from '../../../../models/autorisation-prealable.model';
import { CorporateContract } from '../../../../models/corporate-contract.model';
import {
  ClaimFlag,
  DemandeRemboursement,
  DemandeStatus,
} from '../../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../../models/insurance-company.model';
import { PlanTier } from '../../../../models/plan-tier.model';
import { ProviderNetworkEntry } from '../../../../models/provider-network.model';
import { ActCategory, ClaimSource, CompanySettings } from '../../../../models/shared.model';
import { LocalStorageService, STORAGE_KEYS } from '../../../../core/storage/local-storage.service';

type HealthStatus = 'SAIN' | 'A_SURVEILLER' | 'CRITIQUE';
type RecommendationType =
  | 'SLA'
  | 'ADOPTION'
  | 'RESEAU'
  | 'CONTRAT'
  | 'RISQUE'
  | 'CONFIGURATION'
  | 'CROISSANCE';
type Severity = 'INFO' | 'IMPORTANT' | 'CRITIQUE';

export interface CountRow {
  label: string;
  count: number;
}

export interface AmountRow extends CountRow {
  amount: number;
}

export interface PercentCountRow extends CountRow {
  percent: number;
}

export interface SourcePerformanceRow extends PercentCountRow {
  approvalRate: number;
  incompleteDocumentsRate: number;
  averageProcessingDays: number;
}

export interface CompanyAnalyticsSummary {
  companyId: string;
  company: InsuranceCompany;
  admin?: AdminAccount;
  overview: {
    healthScore: number;
    healthStatus: HealthStatus;
    lastAdminLoginAt: string;
    onboardingCompletionPercent: number;
    executiveSummary: string;
  };
  claims: {
    totalThisMonth: number;
    totalYtd: number;
    monthlyGrowthPercent: number;
    byMonth: { month: string; count: number; amount: number }[];
    byStatus: CountRow[];
    bySource: SourcePerformanceRow[];
    byActCategory: AmountRow[];
    approvalRate: number;
    rejectionRate: number;
    totalBilledAmount: number;
    totalApprovedAmount: number;
    approvedThisMonthAmount: number;
    totalReimbursedAmount: number;
    averageClaimAmount: number;
  };
  operations: {
    averageProcessingDays: number;
    medianProcessingDays: number;
    slaComplianceRate: number;
    overdueClaims: number;
    backlogCount: number;
    readyToDecideCount: number;
    autoApprovedCount: number;
    incompleteDocumentsRate: number;
    slaByActCategory: Array<{ label: string; rate: number; overdue: number }>;
    priorityClaims: DemandeRemboursement[];
  };
  authorizations: {
    pending: number;
    closeToExpiry: number;
    approvedThisMonth: number;
    refusedThisMonth: number;
    autoApprovedThisMonth: number;
    averageResponseDays: number;
    topActTypes: CountRow[];
  };
  corporate: {
    activeContracts: number;
    expiringSoon: number;
    coveredEmployees: number;
    enrolledEmployees: number;
    enrollmentRate: number;
    annualPremiumTotal: number;
    reimbursedYtd: number;
    averageClaimsRatio: number;
    topEmployers: Array<{
      employerName: string;
      employees: number;
      enrolled: number;
      annualPremium: number;
      reimbursedYtd: number;
      claimsRatio: number;
      renewalStatus: string;
    }>;
  };
  members: {
    total: number;
    verified: number;
    pending: number;
    newThisMonth: number;
    activeWithClaims: number;
    planDistribution: CountRow[];
    sourceDistribution: CountRow[];
  };
  network: {
    approvedProviders: number;
    outOfNetworkProvidersUsed: number;
    inNetworkClaimsRate: number;
    outOfNetworkClaimsRate: number;
    tiersPayantEnabled: number;
    providerConcentrationRate: number;
    underservedRegions: string[];
    topProviders: Array<{
      providerName: string;
      providerType: string;
      region: string;
      networkStatus: string;
      claimsThisYear: number;
      reimbursedThisYear: number;
    }>;
  };
  risk: {
    flaggedClaims: number;
    highRiskClaims: number;
    suspectedDuplicates: number;
    amountAtRisk: number;
    recurringRiskProviders: number;
    fraudSharingEnabled: boolean;
    topFlags: CountRow[];
  };
  adoption: {
    adminLastLogin: string;
    actionsThisMonth: number;
    platformProcessedClaims: number;
    finalPdfsGenerated: number;
    signatureConfigured: boolean;
    exportsDownloaded: number;
    communicationsReadRate: number;
    configurationCompletionRate: number;
  };
  configuration: {
    cgaNumberPresent: boolean;
    inpdpNumberPresent: boolean;
    adminActive: boolean;
    onboardingCompleted: boolean;
    plansConfigured: number;
    slaConfigured: boolean;
    reinsuranceThresholdConfigured: boolean;
    priorAuthRulesConfigured: boolean;
    documentSignatureConfigured: boolean;
    fraudSharingEnabled: boolean;
    marketAnalyticsEnabled: boolean;
  };
  recommendations: Array<{
    type: RecommendationType;
    title: string;
    description: string;
    actionLabel: string;
    severity: Severity;
  }>;
}

@Injectable({ providedIn: 'root' })
export class CompanyAnalyticsService {
  private readonly monthFormatter = new Intl.DateTimeFormat('fr-TN', {
    month: 'short',
    year: '2-digit',
  });

  constructor(private readonly storage: LocalStorageService) {}

  getSummary(companyId: string): CompanyAnalyticsSummary | null {
    const company = this.readCompanies().find((item) => item.id === companyId);

    if (!company) {
      return null;
    }

    const admin = this.readAdmins().find((item) => item.companyId === companyId);
    const settings = this.readSettings(company);
    const planTiers = this.withFallback(
      this.readCompany<PlanTier[]>(companyId, 'plan_tiers', []),
      this.fallbackPlanTiers(companyId),
    );
    const contracts = this.withFallback(
      this.readCompany<CorporateContract[]>(companyId, 'contracts', []),
      this.fallbackContracts(company, planTiers),
    );
    const adherents = this.withFallback(
      this.readCompany<Adherent[]>(companyId, 'adherents', []),
      this.fallbackAdherents(company, planTiers, contracts),
    );
    const network = this.withFallback(
      this.readCompany<ProviderNetworkEntry[]>(companyId, 'network', []),
      this.fallbackNetwork(company),
    );
    const demandes = this.withFallback(
      this.readCompany<DemandeRemboursement[]>(companyId, 'demandes', []),
      this.fallbackDemandes(company, contracts, network),
    );
    const autorisations = this.withFallback(
      this.readCompany<AutorisationPrealable[]>(companyId, 'autorisations', []),
      this.fallbackAutorisations(company, network),
    );

    const claims = this.buildClaims(demandes);
    const operations = this.buildOperations(demandes, settings.defaultSlaDays);
    const authorizations = this.buildAuthorizations(autorisations);
    const corporate = this.buildCorporate(contracts);
    const members = this.buildMembers(adherents, demandes);
    const networkSummary = this.buildNetwork(network, demandes);
    const risk = this.buildRisk(demandes, settings.participatesInCrossFraudDetection);
    const configuration = this.buildConfiguration(company, admin, planTiers, settings);
    const adoption = this.buildAdoption(admin, demandes, configuration);
    const healthScore = this.healthScore(
      company,
      claims,
      operations,
      networkSummary,
      risk,
      adoption,
      configuration,
    );
    const overview = {
      healthScore,
      healthStatus: this.healthStatus(healthScore),
      lastAdminLoginAt: admin?.lastLoginAt ?? '',
      onboardingCompletionPercent: configuration.onboardingCompleted
        ? Math.max(85, adoption.configurationCompletionRate)
        : adoption.configurationCompletionRate,
      executiveSummary: this.executiveSummary(
        company,
        operations,
        networkSummary,
        settings.participatesInMarketAnalytics,
      ),
    };
    const recommendations = this.buildRecommendations(
      company,
      claims,
      operations,
      corporate,
      members,
      networkSummary,
      risk,
      configuration,
    );

    return {
      admin,
      adoption,
      authorizations,
      claims,
      company,
      companyId,
      configuration,
      corporate,
      members,
      network: networkSummary,
      operations,
      overview,
      recommendations,
      risk,
    };
  }

  private buildClaims(demandes: DemandeRemboursement[]): CompanyAnalyticsSummary['claims'] {
    const now = new Date();
    const currentMonth = this.monthKey(now);
    const previousMonth = this.monthKey(this.addMonths(now, -1));
    const ytd = demandes.filter((item) => new Date(item.submittedAt).getFullYear() === now.getFullYear());
    const totalThisMonth = demandes.filter((item) => this.monthKey(new Date(item.submittedAt)) === currentMonth).length;
    const totalPreviousMonth = demandes.filter((item) => this.monthKey(new Date(item.submittedAt)) === previousMonth).length;
    const final = demandes.filter((item) => this.isFinalStatus(item.status));
    const approved = demandes.filter((item) => this.isApprovedStatus(item.status));
    const refused = demandes.filter((item) => item.status === 'REFUSEE');
    const totalBilledAmount = this.sum(ytd.map((item) => item.totalAmount));
    const totalApprovedAmount = this.sum(ytd.map((item) => item.approvedAmount ?? 0));
    const approvedThisMonthAmount = this.sum(
      demandes
        .filter((item) => this.monthKey(new Date(item.submittedAt)) === currentMonth)
        .map((item) => item.approvedAmount ?? 0),
    );
    const totalReimbursedAmount = this.sum(ytd.map((item) => item.reimbursementAmount ?? item.approvedAmount ?? 0));

    return {
      approvalRate: this.percent(approved.length, Math.max(final.length, 1)),
      averageClaimAmount: this.safeDivide(totalBilledAmount, Math.max(ytd.length, 1)),
      byActCategory: this.groupAmounts(ytd, (item) => this.actLabel(item.actCategory)),
      byMonth: this.trailingMonths(12).map((month) => {
        const rows = demandes.filter((item) => this.monthKey(new Date(item.submittedAt)) === this.monthKey(month));
        return {
          amount: this.sum(rows.map((item) => item.approvedAmount ?? item.totalAmount)),
          count: rows.length,
          month: this.monthFormatter.format(month),
        };
      }),
      bySource: this.buildSourceRows(ytd),
      byStatus: this.groupCounts(ytd, (item) => this.statusLabel(item.status)),
      monthlyGrowthPercent: totalPreviousMonth
        ? Math.round(((totalThisMonth - totalPreviousMonth) / totalPreviousMonth) * 100)
        : totalThisMonth > 0
          ? 100
          : 0,
      rejectionRate: this.percent(refused.length, Math.max(final.length, 1)),
      approvedThisMonthAmount,
      totalApprovedAmount,
      totalBilledAmount,
      totalReimbursedAmount,
      totalThisMonth,
      totalYtd: ytd.length,
    };
  }

  private buildSourceRows(demandes: DemandeRemboursement[]): SourcePerformanceRow[] {
    const sources: ClaimSource[] = ['OMNICARE', 'MANUEL', 'EMAIL', 'WEBSITE', 'IMPORT_CSV', 'AUTRE'];

    return sources.map((source) => {
      const rows = demandes.filter((item) => item.source === source);
      const final = rows.filter((item) => this.isFinalStatus(item.status));
      const approved = rows.filter((item) => this.isApprovedStatus(item.status));
      const incomplete = rows.filter((item) => item.status === 'DOCUMENTS_INCOMPLETS');

      return {
        approvalRate: this.percent(approved.length, Math.max(final.length, 1)),
        averageProcessingDays: this.averageProcessingDays(rows),
        count: rows.length,
        incompleteDocumentsRate: this.percent(incomplete.length, Math.max(rows.length, 1)),
        label: this.sourceLabel(source),
        percent: this.percent(rows.length, Math.max(demandes.length, 1)),
      };
    });
  }

  private buildOperations(
    demandes: DemandeRemboursement[],
    slaDays: number,
  ): CompanyAnalyticsSummary['operations'] {
    const now = new Date();
    const open = demandes.filter((item) => !this.isFinalStatus(item.status));
    const overdue = open.filter((item) => this.daysBetween(item.submittedAt, now.toISOString()) > slaDays);
    const ready = open.filter((item) => item.status === 'EN_EXAMEN' || item.status === 'DOCUMENTS_INCOMPLETS');
    const completeRows = demandes.filter((item) => item.respondedAt);
    const withinSla = completeRows.filter(
      (item) => this.daysBetween(item.submittedAt, item.respondedAt ?? item.lastUpdatedAt) <= slaDays,
    );
    const processingDays = completeRows.map((item) =>
      this.daysBetween(item.submittedAt, item.respondedAt ?? item.lastUpdatedAt),
    );

    return {
      autoApprovedCount: demandes.filter((item) => item.status === 'APPROUVEE_AUTO').length,
      averageProcessingDays: this.average(processingDays),
      backlogCount: open.length,
      incompleteDocumentsRate: this.percent(
        demandes.filter((item) => item.status === 'DOCUMENTS_INCOMPLETS').length,
        Math.max(demandes.length, 1),
      ),
      medianProcessingDays: this.median(processingDays),
      overdueClaims: overdue.length,
      priorityClaims: [...overdue, ...ready].slice(0, 8),
      readyToDecideCount: ready.length,
      slaByActCategory: this.groupCounts(demandes, (item) => item.actCategory).slice(0, 8).map((row) => {
        const rows = demandes.filter((item) => item.actCategory === row.label);
        const completed = rows.filter((item) => item.respondedAt);
        const categoryOverdue = rows.filter(
          (item) => !this.isFinalStatus(item.status) && this.daysBetween(item.submittedAt, now.toISOString()) > slaDays,
        ).length;
        return {
          label: this.actLabel(row.label as ActCategory),
          overdue: categoryOverdue,
          rate: this.percent(
            completed.filter(
              (item) => this.daysBetween(item.submittedAt, item.respondedAt ?? item.lastUpdatedAt) <= slaDays,
            ).length,
            Math.max(completed.length, 1),
          ),
        };
      }),
      slaComplianceRate: this.percent(withinSla.length, Math.max(completeRows.length, 1)),
    };
  }

  private buildAuthorizations(
    autorisations: AutorisationPrealable[],
  ): CompanyAnalyticsSummary['authorizations'] {
    const now = new Date();
    const month = this.monthKey(now);
    const responded = autorisations.filter((item) => item.respondedAt);

    return {
      approvedThisMonth: autorisations.filter(
        (item) => this.monthKey(new Date(item.respondedAt ?? '')) === month && item.status === 'APPROUVEE',
      ).length,
      autoApprovedThisMonth: autorisations.filter(
        (item) => this.monthKey(new Date(item.respondedAt ?? '')) === month && item.status === 'APPROUVEE_AUTO',
      ).length,
      averageResponseDays: this.average(
        responded.map((item) => this.daysBetween(item.submittedAt, item.respondedAt ?? item.submittedAt)),
      ),
      closeToExpiry: autorisations.filter((item) => {
        const days = this.daysBetween(now.toISOString(), item.expiresAt);
        return days >= 0 && days <= 15;
      }).length,
      pending: autorisations.filter((item) => item.status === 'EN_ATTENTE' || item.status === 'EN_EXAMEN').length,
      refusedThisMonth: autorisations.filter(
        (item) => this.monthKey(new Date(item.respondedAt ?? '')) === month && item.status === 'REFUSEE',
      ).length,
      topActTypes: this.groupCounts(autorisations, (item) => item.actType).slice(0, 5),
    };
  }

  private buildCorporate(contracts: CorporateContract[]): CompanyAnalyticsSummary['corporate'] {
    const active = contracts.filter((item) => item.status === 'ACTIF' || item.status === 'EXPIRATION_PROCHE');
    const coveredEmployees = this.sum(active.map((item) => item.totalEmployees));
    const enrolledEmployees = this.sum(active.map((item) => item.enrolledEmployees));
    const annualPremiumTotal = this.sum(active.map((item) => item.annualPremium));
    const reimbursedYtd = this.sum(active.map((item) => item.reimbursedThisYear));

    return {
      activeContracts: active.length,
      annualPremiumTotal,
      averageClaimsRatio: Math.round(this.safeDivide(reimbursedYtd, Math.max(annualPremiumTotal, 1)) * 1000) / 10,
      coveredEmployees,
      enrolledEmployees,
      enrollmentRate: this.percent(enrolledEmployees, Math.max(coveredEmployees, 1)),
      expiringSoon: contracts.filter((item) => item.status === 'EXPIRATION_PROCHE').length,
      reimbursedYtd,
      topEmployers: active
        .map((item) => ({
          annualPremium: item.annualPremium,
          claimsRatio: Math.round(item.claimsRatio * 1000) / 10,
          employees: item.totalEmployees,
          employerName: item.employerName,
          enrolled: item.enrolledEmployees,
          reimbursedYtd: item.reimbursedThisYear,
          renewalStatus: this.renewalLabel(item),
        }))
        .sort((left, right) => right.annualPremium - left.annualPremium)
        .slice(0, 8),
    };
  }

  private buildMembers(
    adherents: Adherent[],
    demandes: DemandeRemboursement[],
  ): CompanyAnalyticsSummary['members'] {
    const month = this.monthKey(new Date());
    const activeMemberIds = new Set(demandes.map((item) => item.patientMemberId));

    return {
      activeWithClaims: Math.min(activeMemberIds.size, adherents.length),
      newThisMonth: adherents.filter((item) => this.monthKey(new Date(item.enrolledAt)) === month).length,
      pending: adherents.filter((item) => item.verificationStatus === 'EN_ATTENTE').length,
      planDistribution: this.groupCounts(adherents, (item) => item.planTierName),
      sourceDistribution: this.groupCounts(adherents, (item) => this.sourceLabel(item.source)),
      total: adherents.length,
      verified: adherents.filter((item) => item.verificationStatus === 'VERIFIE').length,
    };
  }

  private buildNetwork(
    network: ProviderNetworkEntry[],
    demandes: DemandeRemboursement[],
  ): CompanyAnalyticsSummary['network'] {
    const ytd = demandes.filter((item) => new Date(item.submittedAt).getFullYear() === new Date().getFullYear());
    const inNetwork = ytd.filter((item) => item.providerInNetwork);
    const outNetwork = ytd.filter((item) => !item.providerInNetwork);
    const providerAmounts = this.groupAmounts(ytd, (item) => item.providerName);
    const topThreeAmount = this.sum(providerAmounts.slice(0, 3).map((item) => item.amount));
    const totalReimbursed = this.sum(ytd.map((item) => item.reimbursementAmount ?? item.approvedAmount ?? 0));

    return {
      approvedProviders: network.filter((item) => item.networkStatus === 'AGREE').length,
      inNetworkClaimsRate: this.percent(inNetwork.length, Math.max(ytd.length, 1)),
      outOfNetworkClaimsRate: this.percent(outNetwork.length, Math.max(ytd.length, 1)),
      outOfNetworkProvidersUsed: new Set(outNetwork.map((item) => item.providerName)).size,
      providerConcentrationRate: this.percent(topThreeAmount, Math.max(totalReimbursed, 1)),
      tiersPayantEnabled: network.filter((item) => item.tiersPayantEnabled).length,
      topProviders: providerAmounts.slice(0, 8).map((row) => {
        const provider = network.find((item) => item.providerName === row.label);
        return {
          claimsThisYear: row.count,
          networkStatus: provider?.networkStatus ?? 'HORS_RESEAU',
          providerName: row.label,
          providerType: provider?.providerType ?? 'AUTRE',
          region: provider?.region ?? 'Non renseignée',
          reimbursedThisYear: row.amount,
        };
      }),
      underservedRegions: this.underservedRegions(network),
    };
  }

  private buildRisk(
    demandes: DemandeRemboursement[],
    fraudSharingEnabled: boolean,
  ): CompanyAnalyticsSummary['risk'] {
    const flagged = demandes.filter((item) => item.flags.length > 0 || item.riskScore !== 'FAIBLE');
    const highRisk = demandes.filter((item) => item.riskScore === 'ELEVE');
    const suspectedDuplicates = demandes.filter(
      (item) => item.crossCompanyDuplicateDetected || item.flags.includes('DOUBLON_SUSPECT'),
    );
    const recurringProviders = this.groupCounts(flagged, (item) => item.providerName).filter(
      (item) => item.count >= 2,
    ).length;

    return {
      amountAtRisk: this.sum(highRisk.map((item) => item.totalAmount)),
      flaggedClaims: flagged.length,
      fraudSharingEnabled,
      highRiskClaims: highRisk.length,
      recurringRiskProviders: recurringProviders,
      suspectedDuplicates: suspectedDuplicates.length,
      topFlags: this.groupCounts(
        flagged.flatMap((item) => item.flags),
        (item) => this.flagLabel(item),
      ).slice(0, 6),
    };
  }

  private buildAdoption(
    admin: AdminAccount | undefined,
    demandes: DemandeRemboursement[],
    configuration: CompanyAnalyticsSummary['configuration'],
  ): CompanyAnalyticsSummary['adoption'] {
    const month = this.monthKey(new Date());
    const processedThisMonth = demandes.filter(
      (item) => this.monthKey(new Date(item.submittedAt)) === month && this.isFinalStatus(item.status),
    ).length;

    return {
      actionsThisMonth: processedThisMonth + Math.round(demandes.length * 0.08),
      adminLastLogin: admin?.lastLoginAt ?? '',
      communicationsReadRate: admin?.lastLoginAt ? 86 : 42,
      configurationCompletionRate: this.configurationCompletionRate(configuration),
      exportsDownloaded: admin?.lastLoginAt ? 4 : 0,
      finalPdfsGenerated: demandes.filter((item) => this.isApprovedStatus(item.status)).length,
      platformProcessedClaims: demandes.filter((item) => item.source === 'OMNICARE').length,
      signatureConfigured: configuration.documentSignatureConfigured,
    };
  }

  private buildConfiguration(
    company: InsuranceCompany,
    admin: AdminAccount | undefined,
    planTiers: PlanTier[],
    settings: CompanySettings,
  ): CompanyAnalyticsSummary['configuration'] {
    return {
      adminActive: admin?.status === 'ACTIVE',
      cgaNumberPresent: !!company.cgaRegistrationNumber,
      documentSignatureConfigured: !!company.cgaRegistrationNumber && company.status === 'ACTIVE',
      fraudSharingEnabled: settings.participatesInCrossFraudDetection,
      inpdpNumberPresent: !!company.inpdpDeclarationNumber,
      marketAnalyticsEnabled: settings.participatesInMarketAnalytics,
      onboardingCompleted: company.onboardingCompleted,
      plansConfigured: planTiers.length,
      priorAuthRulesConfigured: settings.priorAuthCategories.length > 0,
      reinsuranceThresholdConfigured: planTiers.some((item) => item.reinsuranceThreshold > 0),
      slaConfigured: settings.defaultSlaDays > 0 || planTiers.some((item) => item.slaTargetDays > 0),
    };
  }

  private buildRecommendations(
    company: InsuranceCompany,
    claims: CompanyAnalyticsSummary['claims'],
    operations: CompanyAnalyticsSummary['operations'],
    corporate: CompanyAnalyticsSummary['corporate'],
    members: CompanyAnalyticsSummary['members'],
    network: CompanyAnalyticsSummary['network'],
    risk: CompanyAnalyticsSummary['risk'],
    configuration: CompanyAnalyticsSummary['configuration'],
  ): CompanyAnalyticsSummary['recommendations'] {
    const recommendations: CompanyAnalyticsSummary['recommendations'] = [
      {
        actionLabel: 'Relancer l’admin',
        description: `${operations.overdueClaims} dossiers dépassent le délai cible, dont ${operations.readyToDecideCount} prêts à décider.`,
        severity: operations.overdueClaims > 8 ? 'CRITIQUE' : 'IMPORTANT',
        title: 'File SLA à traiter',
        type: 'SLA',
      },
      {
        actionLabel: 'Proposer campagne d’activation',
        description: `${claims.bySource[0]?.percent ?? 0}% des demandes viennent d’OmniCare, avec ${members.verified}/${members.total} adhérents vérifiés.`,
        severity: 'IMPORTANT',
        title: 'Adoption plateforme à renforcer',
        type: 'ADOPTION',
      },
      {
        actionLabel: 'Surveiller concentration',
        description: `Les 3 premiers prestataires représentent ${network.providerConcentrationRate}% des remboursements analysés.`,
        severity: network.providerConcentrationRate > 45 ? 'IMPORTANT' : 'INFO',
        title: 'Concentration prestataires',
        type: 'RESEAU',
      },
      {
        actionLabel: 'Préparer renouvellement',
        description: `${corporate.expiringSoon} contrat(s) entreprise arrivent à échéance avec ${corporate.averageClaimsRatio}% de ratio moyen.`,
        severity: corporate.expiringSoon > 0 ? 'IMPORTANT' : 'INFO',
        title: 'Renouvellements entreprises',
        type: 'CONTRAT',
      },
      {
        actionLabel: risk.fraudSharingEnabled ? 'Voir dossiers suspects' : 'Proposer activation partage fraude',
        description: `${risk.flaggedClaims} dossiers flagués, ${risk.suspectedDuplicates} doublons suspects et ${this.roundMoney(risk.amountAtRisk)} TND à risque.`,
        severity: risk.highRiskClaims > 4 ? 'CRITIQUE' : 'IMPORTANT',
        title: 'Fraude et risque',
        type: 'RISQUE',
      },
      {
        actionLabel: 'Compléter configuration',
        description: configuration.marketAnalyticsEnabled
          ? 'Conformité configuration plateforme majoritairement complète.'
          : 'Analytique marché désactivée pour cette compagnie.',
        severity: configuration.marketAnalyticsEnabled ? 'INFO' : 'IMPORTANT',
        title: 'Conformité configuration plateforme',
        type: 'CONFIGURATION',
      },
    ];

    if (company.status === 'EN_ATTENTE' || !configuration.onboardingCompleted) {
      recommendations.unshift({
        actionLabel: 'Finaliser onboarding',
        description: 'Le dossier compagnie n’est pas encore totalement activé dans la console FTUSA.',
        severity: 'IMPORTANT',
        title: 'Activation tenant',
        type: 'CROISSANCE',
      });
    }

    return recommendations.slice(0, 7);
  }

  private healthScore(
    company: InsuranceCompany,
    claims: CompanyAnalyticsSummary['claims'],
    operations: CompanyAnalyticsSummary['operations'],
    network: CompanyAnalyticsSummary['network'],
    risk: CompanyAnalyticsSummary['risk'],
    adoption: CompanyAnalyticsSummary['adoption'],
    configuration: CompanyAnalyticsSummary['configuration'],
  ): number {
    let score = 100;
    score -= Math.max(0, 92 - operations.slaComplianceRate) * 0.35;
    score -= operations.overdueClaims * 1.4;
    score -= Math.max(0, 18 - claims.approvalRate) * 0.2;
    score -= Math.max(0, network.providerConcentrationRate - 38) * 0.25;
    score -= risk.highRiskClaims * 1.2;
    score -= configuration.marketAnalyticsEnabled ? 0 : 6;
    score -= configuration.fraudSharingEnabled ? 0 : 5;
    score -= Math.max(0, 82 - adoption.configurationCompletionRate) * 0.22;

    if (company.status === 'SUSPENDUE') {
      score -= 28;
    }

    if (company.status === 'EN_ATTENTE') {
      score -= 12;
    }

    return Math.max(20, Math.min(98, Math.round(score)));
  }

  private executiveSummary(
    company: InsuranceCompany,
    operations: CompanyAnalyticsSummary['operations'],
    network: CompanyAnalyticsSummary['network'],
    marketAnalyticsEnabled: boolean,
  ): string {
    const points = [
      `${operations.overdueClaims} dossier(s) SLA en retard`,
      `concentration prestataires à ${network.providerConcentrationRate}%`,
    ];

    if (!marketAnalyticsEnabled) {
      points.push('analytique marché désactivée');
    }

    return `${company.name} est ${operations.slaComplianceRate >= 90 ? 'globalement saine' : 'à surveiller'}. Points à surveiller: ${points.join(', ')}.`;
  }

  private readCompanies(): InsuranceCompany[] {
    return this.storage.getItem<InsuranceCompany[]>(STORAGE_KEYS.companies, []);
  }

  private readAdmins(): AdminAccount[] {
    return this.storage.getItem<AdminAccount[]>(STORAGE_KEYS.admins, []);
  }

  private readCompany<T>(companyId: string, resource: Parameters<LocalStorageService['companyKey']>[1], fallback: T): T {
    return this.storage.getItem<T>(this.storage.companyKey(companyId, resource), fallback);
  }

  private readSettings(company: InsuranceCompany): CompanySettings {
    return this.readCompany<CompanySettings>(company.id, 'settings', {
      companyId: company.id,
      defaultSlaDays: 10,
      participatesInCrossFraudDetection: company.participatesInCrossFraudDetection,
      participatesInMarketAnalytics: company.participatesInMarketAnalytics,
      priorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION'],
    });
  }

  private withFallback<T>(value: T[], fallback: T[]): T[] {
    return value.length > 0 ? value : fallback;
  }

  private fallbackPlanTiers(companyId: string): PlanTier[] {
    return [
      {
        autoApproveThreshold: 250,
        claimFilingDeadlineDays: 45,
        companyId,
        coverageRules: [],
        description: 'Plan démonstration pour fiche 360',
        id: `${companyId}-fallback-confort`,
        monthlyPremium: 115,
        name: 'Confort',
        reinsuranceThreshold: 8000,
        requiresPriorAuth: ['CHIRURGIE', 'HOSPITALISATION'],
        slaTargetDays: 10,
      },
    ];
  }

  private fallbackContracts(company: InsuranceCompany, planTiers: PlanTier[]): CorporateContract[] {
    const names = ['Tunisie Telecom', 'Poulina', 'BIAT'];
    return names.map((employerName, index) => ({
      annualPremium: 320000 - index * 62000,
      availablePlanTiers: planTiers.map((item) => item.id),
      claimsRatio: 0.34 + index * 0.08,
      claimsThisYear: 48 - index * 7,
      companyId: company.id,
      contractEndDate: this.addMonths(new Date(), 2 + index * 4).toISOString(),
      contractStartDate: this.addMonths(new Date(), -18).toISOString(),
      employerName,
      employerSector: ['Télécom', 'Industrie', 'Banque'][index],
      enrolledEmployees: 620 - index * 120,
      hrContactEmail: `rh.${index + 1}@example.tn`,
      hrContactName: ['Leila Trabelsi', 'Mouna Gharbi', 'Karim Ben Salem'][index],
      id: `${company.id}-fallback-contract-${index + 1}`,
      reimbursedThisYear: 108000 - index * 21000,
      renewalNoticeDate: this.addMonths(new Date(), 1 + index * 2).toISOString(),
      status: index === 2 ? 'EXPIRATION_PROCHE' : 'ACTIF',
      totalEmployees: 780 - index * 140,
    }));
  }

  private fallbackAdherents(
    company: InsuranceCompany,
    planTiers: PlanTier[],
    contracts: CorporateContract[],
  ): Adherent[] {
    return Array.from({ length: 36 }).map((_, index) => {
      const contract = contracts[index % contracts.length];
      const plan = planTiers[index % planTiers.length];
      return {
        companyId: company.id,
        enrolledAt: this.addMonths(new Date(), index < 5 ? 0 : -Math.ceil(index / 4)).toISOString(),
        enrollmentType: 'GROUPE',
        id: `${company.id}-fallback-adh-${index + 1}`,
        membershipId: `${company.code}-${String(index + 1).padStart(4, '0')}`,
        patientName: `Adhérent ${index + 1}`,
        planTierId: plan.id,
        planTierName: plan.name,
        policyNumber: `POL-${company.code}-${String(index + 1).padStart(4, '0')}`,
        source: index % 4 === 0 ? 'IMPORT_CSV' : 'OMNICARE',
        totalClaimsThisYear: index % 5,
        totalReimbursedThisYear: index * 85,
        verificationStatus: index % 6 === 0 ? 'EN_ATTENTE' : 'VERIFIE',
        employer: {
          contractId: contract.id,
          departmentOrGrade: 'Collaborateur',
          employeeMatricule: `MAT-${index + 1}`,
          employerName: contract.employerName,
        },
      };
    });
  }

  private fallbackNetwork(company: InsuranceCompany): ProviderNetworkEntry[] {
    return [
      this.provider(company.id, 'Clinique Carthage', 'CLINIQUE', 'Tunis', 'Tunis', 'AGREE', true),
      this.provider(company.id, 'Polyclinique du Sahel', 'CLINIQUE', 'Sousse', 'Sousse', 'AGREE', true),
      this.provider(company.id, 'Centre Imagerie du Lac', 'LABORATOIRE', 'Tunis', 'Tunis', 'AGREE', false),
      this.provider(company.id, 'Clinique XYZ', 'CLINIQUE', 'Tunis', 'Tunis', 'HORS_RESEAU', false),
      this.provider(company.id, 'Cabinet Dentaire Dr. Kallel', 'CABINET_DENTAIRE', 'Sfax', 'Sfax', 'EN_COURS_AGREMENT', false),
    ];
  }

  private fallbackDemandes(
    company: InsuranceCompany,
    contracts: CorporateContract[],
    network: ProviderNetworkEntry[],
  ): DemandeRemboursement[] {
    const categories: ActCategory[] = ['CONSULTATION', 'BIOLOGIE', 'CHIRURGIE', 'HOSPITALISATION', 'DENTAIRE'];
    const statuses: DemandeStatus[] = ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'REFUSEE', 'EN_EXAMEN', 'DOCUMENTS_INCOMPLETS'];
    const sources: ClaimSource[] = ['OMNICARE', 'MANUEL', 'EMAIL', 'WEBSITE', 'IMPORT_CSV'];

    return Array.from({ length: 84 }).map((_, index) => {
      const submittedAt = this.addDays(this.addMonths(new Date(), -Math.floor(index / 7)), -(index % 22));
      const status = statuses[index % statuses.length];
      const provider = network[index % network.length];
      const totalAmount = 140 + (index % 9) * 115;
      const approvedAmount = this.isApprovedStatus(status) ? Math.round(totalAmount * 0.68) : undefined;
      const flags = this.fallbackFlags(index, totalAmount, provider.networkStatus);
      const contract = contracts[index % contracts.length];

      return {
        actCategory: categories[index % categories.length],
        actDate: this.dateOnly(this.addDays(submittedAt, -2)),
        actDescription: this.actLabel(categories[index % categories.length]),
        approvedAmount,
        companyId: company.id,
        contractId: contract.id,
        documents: [],
        employerName: contract.employerName,
        factureDate: this.dateOnly(this.addDays(submittedAt, -1)),
        factureNumber: `FAC-${company.code}-${String(index + 1).padStart(5, '0')}`,
        flags,
        id: `${company.id}-fallback-demande-${index + 1}`,
        lastUpdatedAt: this.addDays(submittedAt, 2 + (index % 6)).toISOString(),
        patientMemberId: `${company.code}-${String(index + 1).padStart(4, '0')}`,
        patientName: `Assuré ${index + 1}`,
        planTierName: 'Confort',
        providerInNetwork: provider.networkStatus === 'AGREE',
        providerName: provider.providerName,
        providerType: this.claimProviderType(provider.providerType),
        reimbursementAmount: approvedAmount,
        respondedAt: this.isFinalStatus(status) ? this.addDays(submittedAt, 2 + (index % 6)).toISOString() : undefined,
        riskScore: flags.includes('DOUBLON_SUSPECT') || flags.includes('MONTANT_ELEVE') ? 'ELEVE' : index % 5 === 0 ? 'MOYEN' : 'FAIBLE',
        source: sources[index % sources.length],
        status,
        submittedAt: submittedAt.toISOString(),
        totalAmount,
      };
    });
  }

  private fallbackAutorisations(
    company: InsuranceCompany,
    network: ProviderNetworkEntry[],
  ): AutorisationPrealable[] {
    const statuses: AutorisationPrealable['status'][] = ['EN_ATTENTE', 'APPROUVEE', 'REFUSEE', 'APPROUVEE_AUTO', 'EN_EXAMEN'];
    return Array.from({ length: 18 }).map((_, index) => {
      const submittedAt = this.addDays(new Date(), -index * 4);
      const status = statuses[index % statuses.length];
      return {
        actCategory: index % 2 === 0 ? 'CHIRURGIE' : 'HOSPITALISATION',
        actType: index % 2 === 0 ? 'Chirurgie programmée' : 'Hospitalisation',
        clinicalJustification: 'Dossier médical de démonstration',
        companyId: company.id,
        documents: [],
        expiresAt: this.addDays(new Date(), 7 + index * 3).toISOString(),
        id: `${company.id}-fallback-auth-${index + 1}`,
        patientMemberId: `${company.code}-AUTH-${index + 1}`,
        patientName: `Assuré autorisation ${index + 1}`,
        planTierName: 'Confort',
        plannedDate: this.dateOnly(this.addDays(new Date(), 14 + index)),
        providerInNetwork: index % 4 !== 0,
        providerName: network[index % network.length]?.providerName,
        respondedAt: status === 'EN_ATTENTE' || status === 'EN_EXAMEN' ? undefined : this.addDays(submittedAt, 2 + (index % 3)).toISOString(),
        source: index % 3 === 0 ? 'MANUEL' : 'OMNICARE',
        status,
        submittedAt: submittedAt.toISOString(),
      };
    });
  }

  private provider(
    companyId: string,
    providerName: string,
    providerType: ProviderNetworkEntry['providerType'],
    city: string,
    region: string,
    networkStatus: ProviderNetworkEntry['networkStatus'],
    tiersPayantEnabled: boolean,
  ): ProviderNetworkEntry {
    return {
      agreedSince: this.addMonths(new Date(), -18).toISOString(),
      city,
      claimsThisYear: 0,
      companyId,
      id: `${companyId}-${providerName.toLowerCase().replaceAll(' ', '-')}`,
      networkStatus,
      providerName,
      providerType,
      region,
      specialties: [],
      tiersPayantEnabled,
      totalReimbursedThisYear: 0,
    };
  }

  private fallbackFlags(
    index: number,
    totalAmount: number,
    networkStatus: ProviderNetworkEntry['networkStatus'],
  ): ClaimFlag[] {
    const flags: ClaimFlag[] = [];
    if (index % 11 === 0) flags.push('DOUBLON_SUSPECT');
    if (index % 7 === 0) flags.push('DOCUMENTS_MANQUANTS');
    if (totalAmount > 850) flags.push('MONTANT_ELEVE');
    if (networkStatus === 'HORS_RESEAU') flags.push('PRESTATAIRE_HORS_RESEAU');
    return flags;
  }

  private groupCounts<T>(items: T[], labelFor: (item: T) => string): CountRow[] {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(labelFor(item), (map.get(labelFor(item)) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([label, count]) => ({ count, label }))
      .sort((left, right) => right.count - left.count);
  }

  private groupAmounts(
    items: DemandeRemboursement[],
    labelFor: (item: DemandeRemboursement) => string,
  ): AmountRow[] {
    const map = new Map<string, { amount: number; count: number }>();
    items.forEach((item) => {
      const label = labelFor(item);
      const current = map.get(label) ?? { amount: 0, count: 0 };
      map.set(label, {
        amount: current.amount + (item.reimbursementAmount ?? item.approvedAmount ?? item.totalAmount),
        count: current.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ ...value, label }))
      .sort((left, right) => right.amount - left.amount);
  }

  private configurationCompletionRate(configuration: CompanyAnalyticsSummary['configuration']): number {
    const checks = [
      configuration.cgaNumberPresent,
      configuration.inpdpNumberPresent,
      configuration.adminActive,
      configuration.onboardingCompleted,
      configuration.plansConfigured > 0,
      configuration.slaConfigured,
      configuration.reinsuranceThresholdConfigured,
      configuration.priorAuthRulesConfigured,
      configuration.documentSignatureConfigured,
      configuration.fraudSharingEnabled,
      configuration.marketAnalyticsEnabled,
    ];
    return this.percent(checks.filter(Boolean).length, checks.length);
  }

  private underservedRegions(network: ProviderNetworkEntry[]): string[] {
    const strategicRegions = ['Bizerte', 'Gabès', 'Gafsa', 'Kairouan', 'Médenine', 'Nabeul'];
    const covered = new Set(network.filter((item) => item.networkStatus === 'AGREE').map((item) => item.region));
    return strategicRegions.filter((region) => !covered.has(region)).slice(0, 4);
  }

  private renewalLabel(contract: CorporateContract): string {
    if (contract.status === 'EXPIRATION_PROCHE') {
      const days = this.daysBetween(new Date().toISOString(), contract.contractEndDate);
      return `À préparer (${Math.max(days, 0)} j)`;
    }
    return contract.status === 'ACTIF' ? 'Stable' : contract.status;
  }

  private isFinalStatus(status: DemandeStatus): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO', 'REFUSEE'].includes(status);
  }

  private isApprovedStatus(status: DemandeStatus): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO'].includes(status);
  }

  private claimProviderType(
    providerType: ProviderNetworkEntry['providerType'],
  ): DemandeRemboursement['providerType'] {
    if (['CLINIQUE', 'MEDECIN', 'KINE', 'INFIRMIER', 'AUTRE'].includes(providerType)) {
      return providerType as DemandeRemboursement['providerType'];
    }

    return 'AUTRE';
  }

  private averageProcessingDays(demandes: DemandeRemboursement[]): number {
    const values = demandes
      .filter((item) => item.respondedAt)
      .map((item) => this.daysBetween(item.submittedAt, item.respondedAt ?? item.submittedAt));
    return this.average(values);
  }

  private average(values: number[]): number {
    return values.length ? Math.round(this.safeDivide(this.sum(values), values.length) * 10) / 10 : 0;
  }

  private median(values: number[]): number {
    if (!values.length) {
      return 0;
    }
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10;
  }

  private percent(value: number, total: number): number {
    return total ? Math.round((value / total) * 100) : 0;
  }

  private safeDivide(value: number, total: number): number {
    return total ? value / total : 0;
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private daysBetween(startIso: string, endIso: string): number {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return 0;
    }
    return Math.max(0, Math.round((end - start) / 86_400_000));
  }

  private trailingMonths(count: number): Date[] {
    const now = new Date();
    return Array.from({ length: count })
      .map((_, index) => this.addMonths(new Date(now.getFullYear(), now.getMonth(), 1), index - count + 1));
  }

  private monthKey(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private healthStatus(score: number): HealthStatus {
    if (score >= 78) return 'SAIN';
    if (score >= 55) return 'A_SURVEILLER';
    return 'CRITIQUE';
  }

  private roundMoney(value: number): number {
    return Math.round(value);
  }

  private sourceLabel(source: ClaimSource): string {
    const labels: Record<ClaimSource, string> = {
      AUTRE: 'Autre',
      EMAIL: 'Email',
      IMPORT_CSV: 'Import CSV',
      MANUEL: 'Manuel',
      OMNICARE: 'OmniCare',
      WEBSITE: 'Website',
    };
    return labels[source];
  }

  private statusLabel(status: DemandeStatus): string {
    const labels: Record<DemandeStatus, string> = {
      APPROUVEE: 'Approuvée',
      APPROUVEE_AUTO: 'Approuvée auto',
      APPROUVEE_PARTIELLEMENT: 'Approuvée partiellement',
      DOCUMENTS_INCOMPLETS: 'Documents incomplets',
      EN_EXAMEN: 'En examen',
      REFUSEE: 'Refusée',
      SOUMISE: 'Soumise',
    };
    return labels[status];
  }

  private actLabel(category: ActCategory): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^\p{L}/u, (first) => first.toUpperCase());
  }

  private flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai soumission',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Prestataire hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };
    return labels[flag];
  }
}
