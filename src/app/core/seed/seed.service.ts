import { Injectable, inject } from '@angular/core';

import { Adherent } from '../../models/adherent.model';
import { AdhesionRequest } from '../../models/adhesion-request.model';
import { AdminAccount } from '../../models/admin-account.model';
import { AutorisationPrealable } from '../../models/autorisation-prealable.model';
import { Communication } from '../../models/communication.model';
import { CorporateContract } from '../../models/corporate-contract.model';
import { DemandeRemboursement } from '../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../models/insurance-company.model';
import { PlanTier } from '../../models/plan-tier.model';
import { ProviderNetworkEntry } from '../../models/provider-network.model';
import { DocumentType, RequestDocument } from '../../models/request-document.model';
import {
  ActCategory,
  ActCategoryMetadata,
  ClaimSource,
  CompanySettings,
  PlatformSettings,
} from '../../models/shared.model';
import { LocalStorageService, STORAGE_KEYS } from '../storage/local-storage.service';

interface CrossCompanyFraudAlert {
  id: string;
  type: 'DOUBLON_INTER_COMPAGNIE';
  patientHash: string;
  factureHash: string;
  factureNumber: string;
  factureDate: string;
  totalAmount: number;
  detectedAt: string;
  status: 'NOUVEAU' | 'NOTIFIE' | 'CLOTURE';
  cases: CrossCompanyFraudCase[];
  recommendation: string;
}

interface CrossCompanyFraudCase {
  companyId: string;
  companyName: string;
  demandeId: string;
  submittedAt: string;
  riskScore: 'FAIBLE' | 'MOYEN' | 'ELEVE';
}

interface MarketSeedProfile {
  annualClaims: number;
  averageDelayDays: number;
  delayJitterDays: number;
  approvalRate: number;
  defaultSlaDays: number;
}

interface CategorySeedProfile {
  category: ActCategory;
  weight: number;
  minAmount: number;
  maxAmount: number;
  description: string;
  providerType: DemandeRemboursement['providerType'];
}

interface WeightedSeedChoice<T> {
  value: T;
  weight: number;
}

@Injectable({ providedIn: 'root' })
export class SeedService {
  private readonly storage = inject(LocalStorageService);
  private readonly seedVersion = 'v3';
  private readonly crossCompanyFraudKey = 'omnicare_ftusa_cross_company_fraud_alerts';

  initialize(): void {
    this.seed();
  }

  seed(): void {
    if (this.storage.getItem<string | boolean | null>(STORAGE_KEYS.seeded, null) === this.seedVersion) {
      return;
    }

    this.clearDemoKeys();
    this.seedAll();
    this.storage.setItem(STORAGE_KEYS.seeded, this.seedVersion);
  }

  resetAndReseed(): void {
    this.clearDemoKeys();
    this.seedAll();
    this.storage.setItem(STORAGE_KEYS.seeded, this.seedVersion);
  }

  private seedAll(): void {
    this.seedFtusaCompanies();
    this.seedStarTenant();
    this.seedComarTenant();
    this.seedMarketClaimBook();
    this.seedCommunications();
    this.seedAdhesionRequests();
    this.seedCrossCompanyFraud();
  }

  private seedFtusaCompanies(): void {
    const companies: InsuranceCompany[] = [
      this.company('star', 'STAR Assurances', 'STAR', 'ACTIVE', true, true),
      this.company('comar', 'COMAR Assurances', 'COMAR', 'ACTIVE', true, false),
      this.company('gat', 'GAT Assurances', 'GAT', 'ACTIVE', true, true),
      this.company('maghrebia', 'Maghrebia', 'MAG', 'ACTIVE', false, true),
      this.company('carte', 'CARTE Assurances', 'CARTE', 'ACTIVE', false, false),
      this.company('bh', 'BH Assurance', 'BH', 'ACTIVE', true, true),
      this.company('ami', 'AMI Assurances', 'AMI', 'ACTIVE', true, true),
      this.company('maghrebia-vie', 'Maghrebia Vie', 'MAGV', 'ACTIVE', false, true),
      this.company('astree', 'ASTREE Assurances', 'AST', 'EN_ATTENTE', false, false),
      this.company('biat-assurances', 'BIAT Assurances', 'BIATA', 'EN_ATTENTE', false, false),
      this.company('lloyd-tunisien', 'Lloyd Tunisien', 'LLOYD', 'EN_ATTENTE', false, false),
      this.company('ctama', 'CTAMA', 'CTAMA', 'EN_ATTENTE', false, false),
      this.company('zitouna-takaful', 'Zitouna Takaful', 'ZIT', 'EN_ATTENTE', false, false),
      this.company('at-takafulia', 'At-Takafulia', 'TAK', 'EN_ATTENTE', false, false),
      this.company('al-baraka', 'Al Baraka Assurances', 'BAR', 'EN_ATTENTE', false, false),
      this.company('hayett', 'Hayett', 'HAY', 'EN_ATTENTE', false, false),
      this.company('gat-vie', 'GAT Vie', 'GATV', 'EN_ATTENTE', false, false),
      this.company('comar-vie', 'COMAR Vie', 'COMV', 'EN_ATTENTE', false, false),
      this.company('carte-vie', 'CARTE Vie', 'CARTV', 'EN_ATTENTE', false, false),
      this.company('lloyd-vie', 'Lloyd Vie', 'LLOYDV', 'EN_ATTENTE', false, false),
      this.company('uib-assurances', 'UIB Assurances', 'UIBA', 'EN_ATTENTE', false, false),
      this.company('mae', 'MAE Assurances', 'MAE', 'SUSPENDUE', false, false),
      this.company('attijari-assurance', 'Attijari Assurance', 'ATTJ', 'EN_ATTENTE', false, false),
      this.company('tunis-re', 'Tunis Re', 'TRE', 'SUSPENDUE', false, false),
    ];

    const admins: AdminAccount[] = [
      {
        id: 'admin-ftusa-001',
        role: 'FTUSA_ADMIN',
        name: 'Mohamed Khelifa',
        email: 'ftusa-admin@ftusanet.org',
        status: 'ACTIVE',
        lastLoginAt: this.daysAgo(1),
      },
      {
        id: 'admin-star-001',
        role: 'ASSURANCE_ADMIN',
        companyId: 'star',
        name: 'Ahmed Direche',
        email: 'ahmed.direche@star.com.tn',
        status: 'ACTIVE',
        lastLoginAt: this.hoursAgo(3),
      },
      {
        id: 'admin-comar-001',
        role: 'ASSURANCE_ADMIN',
        companyId: 'comar',
        name: 'Sami Bouzid',
        email: 'sami.bouzid@comar.tn',
        status: 'ACTIVE',
        lastLoginAt: this.daysAgo(1),
      },
    ];

    const platformSettings: PlatformSettings = {
      minimumMarketSlaDays: 10,
      mandatoryPriorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION'],
      legalAutoApprovalDays: 15,
    };

    this.storage.setItem(STORAGE_KEYS.companies, companies);
    this.storage.setItem(STORAGE_KEYS.admins, admins);
    this.storage.setItem(STORAGE_KEYS.actCategories, this.actCategoryMetadata());
    this.storage.setItem(STORAGE_KEYS.platformSettings, platformSettings);
  }

  private seedStarTenant(): void {
    const planTiers = this.starPlanTiers();
    const contracts = this.starCorporateContracts(planTiers);
    const adherents = this.starAdherents();
    const demandes = this.starDemandes();
    const autorisations = this.starAutorisations();
    const network = this.starNetwork();
    const settings: CompanySettings = {
      companyId: 'star',
      participatesInCrossFraudDetection: true,
      participatesInMarketAnalytics: true,
      defaultSlaDays: 10,
      priorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION', 'MATERNITE'],
    };

    this.storage.setItem(this.storage.companyKey('star', 'plan_tiers'), planTiers);
    this.storage.setItem(this.storage.companyKey('star', 'contracts'), contracts);
    this.storage.setItem(this.storage.companyKey('star', 'adherents'), adherents);
    this.storage.setItem(this.storage.companyKey('star', 'demandes'), demandes);
    this.storage.setItem(this.storage.companyKey('star', 'autorisations'), autorisations);
    this.storage.setItem(this.storage.companyKey('star', 'network'), network);
    this.storage.setItem(this.storage.companyKey('star', 'settings'), settings);
  }

  private seedComarTenant(): void {
    const planTiers = this.comarPlanTiers();
    const contracts = this.comarCorporateContracts(planTiers);
    const adherents = this.comarAdherents();
    const demandes = this.comarDemandes();
    const autorisations = this.comarAutorisations();
    const network = this.comarNetwork();
    const settings: CompanySettings = {
      companyId: 'comar',
      participatesInCrossFraudDetection: true,
      participatesInMarketAnalytics: false,
      defaultSlaDays: 12,
      priorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION'],
    };

    this.storage.setItem(this.storage.companyKey('comar', 'plan_tiers'), planTiers);
    this.storage.setItem(this.storage.companyKey('comar', 'contracts'), contracts);
    this.storage.setItem(this.storage.companyKey('comar', 'adherents'), adherents);
    this.storage.setItem(this.storage.companyKey('comar', 'demandes'), demandes);
    this.storage.setItem(this.storage.companyKey('comar', 'autorisations'), autorisations);
    this.storage.setItem(this.storage.companyKey('comar', 'network'), network);
    this.storage.setItem(this.storage.companyKey('comar', 'settings'), settings);
  }

  private seedMarketClaimBook(): void {
    const companies = this.storage
      .getItem<InsuranceCompany[]>(STORAGE_KEYS.companies, [])
      .filter((company) => company.status === 'ACTIVE');
    const claimsByCompany = new Map<string, DemandeRemboursement[]>();

    for (const company of companies) {
      const settings = this.ensureCompanySettings(company);
      const profile = this.marketSeedProfile(company.id, settings);
      this.ensureCompanyTenantShell(company, profile);

      const existingDemandes = this.storage
        .getItem<DemandeRemboursement[]>(this.storage.companyKey(company.id, 'demandes'), [])
        .filter((demande) => !this.isSyntheticMarketClaim(demande.id));
      const targetClaims = settings.participatesInMarketAnalytics
        ? profile.annualClaims
        : this.optOutAnnualClaims(company.id, settings, profile);
      const syntheticDemandes =
        targetClaims > 0 ? this.generateCompanyMarketClaims(company, settings, profile, targetClaims) : [];

      claimsByCompany.set(company.id, [...existingDemandes, ...syntheticDemandes]);
    }

    this.seedCrossCompanyDuplicatePairs(companies, claimsByCompany);

    for (const [companyId, demandes] of claimsByCompany.entries()) {
      this.storage.setItem(this.storage.companyKey(companyId, 'demandes'), demandes);
      this.recomputeCompanyClaimStats(companyId, demandes);
    }
  }

  private ensureCompanySettings(company: InsuranceCompany): CompanySettings {
    const key = this.storage.companyKey(company.id, 'settings');
    const defaults: CompanySettings = {
      companyId: company.id,
      participatesInCrossFraudDetection: company.participatesInCrossFraudDetection,
      participatesInMarketAnalytics: company.participatesInMarketAnalytics,
      defaultSlaDays: this.defaultSlaDaysForCompany(company.id),
      priorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION', 'MATERNITE'],
    };
    const settings = this.storage.getItem<CompanySettings | null>(key, null);
    const next = settings
      ? {
          ...defaults,
          ...settings,
          priorAuthCategories:
            settings.priorAuthCategories?.length > 0
              ? settings.priorAuthCategories
              : defaults.priorAuthCategories,
        }
      : defaults;

    this.storage.setItem(key, next);
    return next;
  }

  private ensureCompanyTenantShell(company: InsuranceCompany, profile: MarketSeedProfile): void {
    const planTiersKey = this.storage.companyKey(company.id, 'plan_tiers');
    const contractsKey = this.storage.companyKey(company.id, 'contracts');
    const adherentsKey = this.storage.companyKey(company.id, 'adherents');
    const autorisationsKey = this.storage.companyKey(company.id, 'autorisations');
    const networkKey = this.storage.companyKey(company.id, 'network');
    const demandesKey = this.storage.companyKey(company.id, 'demandes');

    if (!this.storage.hasItem(planTiersKey)) {
      this.storage.setItem(planTiersKey, this.genericPlanTiers(company, profile));
    }

    if (!this.storage.hasItem(contractsKey)) {
      const planTiers = this.storage.getItem<PlanTier[]>(planTiersKey, []);
      this.storage.setItem(contractsKey, this.genericCorporateContracts(company, planTiers));
    }

    if (!this.storage.hasItem(adherentsKey)) {
      this.storage.setItem(adherentsKey, []);
    }

    if (!this.storage.hasItem(autorisationsKey)) {
      this.storage.setItem(autorisationsKey, []);
    }

    if (!this.storage.hasItem(networkKey)) {
      this.storage.setItem(networkKey, this.genericNetwork(company));
    }

    if (!this.storage.hasItem(demandesKey)) {
      this.storage.setItem(demandesKey, []);
    }
  }

  private generateCompanyMarketClaims(
    company: InsuranceCompany,
    settings: CompanySettings,
    profile: MarketSeedProfile,
    targetClaims: number,
  ): DemandeRemboursement[] {
    const rng = this.seededRandom(`${company.id}|market-v2`);
    const months = this.trailingMonthStarts(12);
    const monthCounts = this.distributeClaimsByMonth(targetClaims, months);
    const contracts = this.storage.getItem<CorporateContract[]>(
      this.storage.companyKey(company.id, 'contracts'),
      [],
    );
    const demandes: DemandeRemboursement[] = [];
    let sequence = 1;

    monthCounts.forEach((claimCount, monthIndex) => {
      for (let index = 0; index < claimCount; index += 1) {
        const id = `${company.id}-synthetic-${this.yearMonth(months[monthIndex])}-${String(sequence).padStart(4, '0')}`;
        const category = this.weightedChoice(this.categorySeedProfiles(), rng);
        const submittedAtDate = this.randomDateInMonth(months[monthIndex], rng);
        const actDate = this.addDays(submittedAtDate, -Math.floor(rng() * 9));
        const providerInNetwork = rng() > (this.isHighCostCategory(category.category) ? 0.14 : 0.09);
        const totalAmount = this.randomAmount(category, rng);
        const flags = this.syntheticFlags(category.category, totalAmount, providerInNetwork, settings, rng);
        let status = this.syntheticStatus(profile.approvalRate, rng);
        let respondedAt: string | undefined;

        if (this.isFinalDemandeStatus(status)) {
          const responseDate = this.addDays(
            submittedAtDate,
            this.sampleDelayDays(profile, category.category, totalAmount, rng),
          );

          if (responseDate.getTime() <= Date.now()) {
            respondedAt = responseDate.toISOString();
          } else {
            status = this.weightedChoice(
              [
                { value: 'SOUMISE' as const, weight: 1 },
                { value: 'EN_EXAMEN' as const, weight: 3 },
              ],
              rng,
            );
          }
        }

        const contract = contracts.length > 0 && rng() < 0.7 ? this.pick(contracts, rng) : undefined;
        const approvedAmount = this.syntheticApprovedAmount(status, totalAmount, rng);
        const providerName = this.providerNameForCategory(category.category, providerInNetwork, rng);

        demandes.push(
          this.demande({
            id,
            companyId: company.id,
            patientName: this.tunisianPatientName(rng),
            patientMemberId: `${company.code}-${String(25 + (sequence % 3)).padStart(2, '0')}-${String(1000 + sequence).padStart(5, '0')}`,
            planTierName: this.weightedChoice(
              [
                { value: 'Confort', weight: 5 },
                { value: 'Premium', weight: 3 },
                { value: 'Basique', weight: 2 },
              ],
              rng,
            ),
            employerName: contract?.employerName,
            contractId: contract?.id,
            factureNumber: `FAC-${company.code}-${this.yearMonth(submittedAtDate)}-${String(sequence).padStart(5, '0')}`,
            factureDate: this.dateFromDate(actDate),
            providerName,
            providerType: category.providerType,
            providerInNetwork,
            actCategory: category.category,
            actDescription: category.description,
            totalAmount,
            source: this.sourceForMonth(monthIndex, months.length, rng),
            status,
            submittedAt: submittedAtDate.toISOString(),
            actDate: this.dateFromDate(actDate),
            approvedAmount,
            rejectionReason: status === 'REFUSEE' ? this.rejectionReasonForFlags(flags, rng) : undefined,
            rejectionNotes:
              status === 'REFUSEE'
                ? 'Décision simulée selon les règles de couverture et de conformité du dossier.'
                : undefined,
            flags,
            riskScore: this.riskScoreForClaim(flags, totalAmount, providerInNetwork, rng),
            documents:
              status === 'DOCUMENTS_INCOMPLETS'
                ? this.claimDocuments(id, ['FACTURE'], ['BULLETIN_DE_SOINS'])
                : undefined,
            respondedAt,
            respondedBy: respondedAt ? this.responderName(company.id) : undefined,
            lastUpdatedAt:
              respondedAt ??
              this.capToNow(
                this.addDays(submittedAtDate, Math.max(1, Math.floor(rng() * 4))),
              ).toISOString(),
          }),
        );

        sequence += 1;
      }
    });

    return demandes;
  }

  private seedCrossCompanyDuplicatePairs(
    companies: InsuranceCompany[],
    claimsByCompany: Map<string, DemandeRemboursement[]>,
  ): void {
    const companyById = new Map(companies.map((company) => [company.id, company]));
    const months = this.trailingMonthStarts(12);
    const pairs = [
      { companyIds: ['gat', 'bh'], monthBack: 0, patientName: 'Nour Ben Salah', amount: 6200, category: 'CHIRURGIE' as ActCategory },
      { companyIds: ['star', 'ami'], monthBack: 1, patientName: 'Rania Jaziri', amount: 480, category: 'RADIOLOGIE' as ActCategory },
      { companyIds: ['comar', 'bh'], monthBack: 2, patientName: 'Walid Kacem', amount: 7800, category: 'HOSPITALISATION' as ActCategory },
      { companyIds: ['gat', 'ami'], monthBack: 3, patientName: 'Sarra Chebbi', amount: 1550, category: 'KINESITHERAPIE' as ActCategory },
      { companyIds: ['star', 'bh'], monthBack: 4, patientName: 'Moez Trabelsi', amount: 9400, category: 'CHIRURGIE' as ActCategory },
      { companyIds: ['comar', 'ami'], monthBack: 5, patientName: 'Ines Baccouche', amount: 360, category: 'BIOLOGIE' as ActCategory },
      { companyIds: ['star', 'gat'], monthBack: 6, patientName: 'Yassine Sassi', amount: 12800, category: 'HOSPITALISATION' as ActCategory },
      { companyIds: ['bh', 'ami'], monthBack: 7, patientName: 'Maroua Kallel', amount: 720, category: 'DENTAIRE' as ActCategory },
    ];

    pairs.forEach((pair, pairIndex) => {
      const pairCompanies = pair.companyIds
        .map((companyId) => companyById.get(companyId))
        .filter((company): company is InsuranceCompany => !!company)
        .filter((company) => this.readCompanySettings(company.id)?.participatesInCrossFraudDetection);

      if (pairCompanies.length < 2) {
        return;
      }

      const month = months[Math.max(0, months.length - 1 - pair.monthBack)];
      const factureDate = this.duplicateFactureDate(month, pairIndex);
      const factureNumber = `FAC-ALFA-${this.yearMonth(factureDate)}-${String(841 + pairIndex).padStart(4, '0')}`;
      const category = this.categorySeedProfiles().find(
        (item) => item.value.category === pair.category,
      )?.value;

      if (!category) {
        return;
      }

      pairCompanies.slice(0, 2).forEach((company, companyIndex) => {
        const submittedAt = this.addDays(factureDate, 1 + companyIndex + (pairIndex % 2));
        const demandes = claimsByCompany.get(company.id) ?? [];
        const contract = this.pick(
          this.storage.getItem<CorporateContract[]>(this.storage.companyKey(company.id, 'contracts'), []),
          this.seededRandom(`${company.id}|dup-contract|${pairIndex}`),
        );
        const providerInNetwork = companyIndex === 0;
        const flags: DemandeRemboursement['flags'] = providerInNetwork
          ? ['DOUBLON_SUSPECT', 'MONTANT_ELEVE']
          : ['DOUBLON_SUSPECT', 'MONTANT_ELEVE', 'PRESTATAIRE_HORS_RESEAU'];

        claimsByCompany.set(company.id, [
          ...demandes,
          this.demande({
            id: `${company.id}-dup-${String(pairIndex + 1).padStart(2, '0')}-${companyIndex + 1}`,
            companyId: company.id,
            patientName: pair.patientName,
            patientMemberId: `${company.code}-DUP-${String(pairIndex + 1).padStart(3, '0')}`,
            planTierName: 'Confort',
            employerName: contract?.employerName,
            contractId: contract?.id,
            factureNumber,
            factureDate: this.dateFromDate(factureDate),
            providerName: this.providerNameForCategory(pair.category, providerInNetwork, () => 0.42),
            providerType: category.providerType,
            providerInNetwork,
            actCategory: pair.category,
            actDescription: category.description,
            totalAmount: pair.amount,
            source: companyIndex === 0 ? 'OMNICARE' : 'WEBSITE',
            status: 'EN_EXAMEN',
            submittedAt: submittedAt.toISOString(),
            actDate: this.dateFromDate(factureDate),
            flags,
            riskScore: 'ELEVE',
            crossCompanyDuplicateDetected: true,
            lastUpdatedAt: submittedAt.toISOString(),
          }),
        ]);
      });
    });
  }

  private seedCommunications(): void {
    const communications: Communication[] = [
      {
        id: 'comm-urgent-fraude-001',
        sentBy: 'Mohamed Khelifa',
        sentAt: this.daysAgo(2),
        category: 'ALERTE_FRAUDE',
        priority: 'URGENT',
        subject: 'Nouveau schéma détecté: factures dupliquées',
        body:
          'Signal inter-compagnies sur des factures identiques liées à Clinique XYZ. Merci de vérifier les dossiers récents avant décision.',
        recipientCompanyIds: [],
        readReceipts: this.readReceipts(['star', 'comar', 'gat', 'bh', 'ami'], 2),
        isMandatory: false,
      },
      {
        id: 'comm-reglementaire-001',
        sentBy: 'Mohamed Khelifa',
        sentAt: this.daysAgo(5),
        category: 'REGLEMENTAIRE',
        priority: 'IMPORTANT',
        subject: 'Plafonds CNAM 2026 — révision recommandée des plans',
        body:
          'Note informative FTUSA: les compagnies sont invitées à revoir leurs plafonds internes avant la campagne de renouvellement 2026.',
        recipientCompanyIds: [],
        readReceipts: this.readReceipts(
          ['star', 'comar', 'gat', 'maghrebia', 'carte', 'bh', 'ami'],
          5,
        ),
        isMandatory: false,
      },
      {
        id: 'comm-systeme-001',
        sentBy: 'Mohamed Khelifa',
        sentAt: this.daysAgo(8),
        category: 'ANNONCE_SYSTEME',
        priority: 'INFO',
        subject: 'Nouvelle fonctionnalité: import CSV des adhérents',
        body:
          'La plateforme de démonstration prend désormais en charge un parcours d’import CSV pour les adhérents et les demandes en lot.',
        recipientCompanyIds: [],
        readReceipts: this.readReceipts(
          ['star', 'comar', 'gat', 'maghrebia', 'carte', 'bh', 'ami', 'maghrebia-vie'],
          8,
        ),
        isMandatory: false,
      },
    ];

    this.storage.setItem(STORAGE_KEYS.communications, communications);
  }

  private seedAdhesionRequests(): void {
    const requests: AdhesionRequest[] = [
      {
        id: 'adh-omni-001',
        externalRequestId: 'OMNI-ADH-2026-0142',
        source: 'OMNICARE',
        status: 'PRETE_A_PROPOSER',
        submittedAt: this.hoursAgo(7),
        updatedAt: this.hoursAgo(2),
        applicantName: 'Karim Mansour',
        applicantEmail: 'karim.mansour@example.com',
        applicantPhone: '+216 24 118 540',
        address: '12 rue Ibn Khaldoun, Mutuelleville',
        city: 'Tunis',
        employerName: 'Tunisie Telecom',
        profession: 'Chef de projet SI',
        annualSalary: 54000,
        companyEntryDate: '2018-04-16',
        familySituation: 'MARIE',
        marriageDate: '2019-06-22',
        requestedCoverage: ['SANTE_COMPLEMENTAIRE', 'INCAPACITE_INVALIDITE', 'DECES'],
        desiredEffectiveDate: this.dateOnly(this.daysFromNow(18)),
        currentHealthCoverage: 'CNAM uniquement, aucune assurance complémentaire privée',
        providentScheme: 'Régime employeur de base',
        deathBeneficiary: 'Sarra Mansour, conjointe',
        members: [
          {
            id: 'adh-omni-001-assure',
            relationship: 'ASSURE',
            fullName: 'Karim Mansour',
            birthDate: '1986-03-14',
            cin: '08641572',
            profession: 'Chef de projet SI',
            medical: {
              goodHealth: true,
              heightCm: 178,
              weightKg: 82,
              notes: 'Déclaration complète, aucun antécédent signalé.',
            },
          },
          {
            id: 'adh-omni-001-conjoint',
            relationship: 'CONJOINT',
            fullName: 'Sarra Mansour',
            birthDate: '1990-11-03',
            cin: '09031184',
            profession: 'Architecte',
            medical: {
              goodHealth: true,
              heightCm: 166,
              weightKg: 61,
            },
          },
          {
            id: 'adh-omni-001-enfant-1',
            relationship: 'ENFANT',
            fullName: 'Adam Mansour',
            birthDate: '2021-09-18',
            medical: {
              goodHealth: true,
              notes: 'Extrait de naissance reçu.',
            },
          },
          {
            id: 'adh-omni-001-enfant-2',
            relationship: 'ENFANT',
            fullName: 'Lina Mansour',
            birthDate: '2024-02-07',
            medical: {
              goodHealth: true,
              notes: 'Extrait de naissance reçu.',
            },
          },
        ],
        documents: [
          {
            id: 'adh-omni-001-doc-identity',
            label: "Carte d'identité de l'assuré",
            ownerName: 'Karim Mansour',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-001-doc-marriage',
            label: 'Justificatif de mariage',
            ownerName: 'Karim Mansour',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-001-doc-children',
            label: 'Extraits de naissance des enfants',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-001-doc-medical',
            label: 'Questionnaire médical famille',
            required: true,
            status: 'RECU',
          },
        ],
        missingItems: [],
        internalNotes:
          'Demande complète avec conjoint et deux enfants. Le bulletin COMAR fourni en référence couvre les champs attendus.',
      },
      {
        id: 'adh-omni-002',
        externalRequestId: 'OMNI-ADH-2026-0143',
        source: 'OMNICARE',
        status: 'A_COMPLETER',
        submittedAt: this.daysAgo(1, 3),
        updatedAt: this.hoursAgo(4),
        applicantName: 'Ines Trabelsi',
        applicantEmail: 'ines.trabelsi@example.com',
        applicantPhone: '+216 29 770 312',
        address: 'Avenue Hedi Nouira, Sfax',
        city: 'Sfax',
        profession: 'Consultante indépendante',
        annualSalary: 38000,
        familySituation: 'CELIBATAIRE',
        requestedCoverage: ['SANTE_COMPLEMENTAIRE'],
        desiredEffectiveDate: this.dateOnly(this.daysFromNow(12)),
        currentHealthCoverage: 'Contrat individuel arrivé à échéance',
        members: [
          {
            id: 'adh-omni-002-assure',
            relationship: 'ASSURE',
            fullName: 'Ines Trabelsi',
            birthDate: '1992-08-09',
            profession: 'Consultante indépendante',
            medical: {
              goodHealth: true,
              heightCm: 169,
              weightKg: 64,
              currentTreatment: 'Déclaration non renseignée dans OmniCare.',
            },
          },
        ],
        documents: [
          {
            id: 'adh-omni-002-doc-identity',
            label: "Carte d'identité",
            ownerName: 'Ines Trabelsi',
            required: true,
            status: 'MANQUANT',
          },
          {
            id: 'adh-omni-002-doc-medical',
            label: 'Questionnaire médical',
            ownerName: 'Ines Trabelsi',
            required: true,
            status: 'DEMANDE',
          },
        ],
        missingItems: [
          "Carte d'identité nationale",
          'Réponse complète au questionnaire médical',
          'Confirmation du revenu annuel déclaré',
        ],
        lastAction: {
          type: 'INFOS_DEMANDEES',
          at: this.hoursAgo(4),
          label: 'Complément demandé depuis la démo FTUSA',
        },
      },
      {
        id: 'adh-omni-003',
        externalRequestId: 'OMNI-ADH-2026-0144',
        source: 'OMNICARE',
        status: 'NOUVELLE',
        submittedAt: this.hoursAgo(18),
        updatedAt: this.hoursAgo(18),
        applicantName: 'Hatem Ben Ali',
        applicantEmail: 'hatem.benali@example.com',
        applicantPhone: '+216 55 901 404',
        address: 'Rue de Carthage, Les Berges du Lac',
        city: 'Tunis',
        employerName: 'BIAT',
        profession: 'Conseiller clientèle',
        annualSalary: 46000,
        companyEntryDate: '2021-01-04',
        familySituation: 'MARIE',
        marriageDate: '2020-09-12',
        requestedCoverage: ['SANTE_COMPLEMENTAIRE', 'DECES'],
        desiredEffectiveDate: this.dateOnly(this.daysFromNow(25)),
        currentHealthCoverage: 'CNAM + contrat employeur partiel',
        providentScheme: 'Prévoyance groupe BIAT',
        deathBeneficiary: 'Nour Ben Ali, conjointe',
        members: [
          {
            id: 'adh-omni-003-assure',
            relationship: 'ASSURE',
            fullName: 'Hatem Ben Ali',
            birthDate: '1989-12-02',
            cin: '08912021',
            profession: 'Conseiller clientèle',
            medical: {
              goodHealth: true,
              heightCm: 181,
              weightKg: 86,
            },
          },
          {
            id: 'adh-omni-003-conjoint',
            relationship: 'CONJOINT',
            fullName: 'Nour Ben Ali',
            birthDate: '1993-05-19',
            cin: '09305198',
            profession: 'Enseignante',
            medical: {
              goodHealth: true,
              heightCm: 163,
              weightKg: 58,
            },
          },
          {
            id: 'adh-omni-003-enfant-1',
            relationship: 'ENFANT',
            fullName: 'Youssef Ben Ali',
            birthDate: '2022-10-11',
            medical: {
              goodHealth: false,
              chronicDisease: 'Asthme léger déclaré par le parent',
              notes: 'Certificat médical demandé avant émission de l’offre.',
            },
          },
        ],
        documents: [
          {
            id: 'adh-omni-003-doc-identity',
            label: "Cartes d'identité assuré et conjointe",
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-003-doc-child',
            label: "Extrait de naissance de l'enfant",
            ownerName: 'Youssef Ben Ali',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-003-doc-medical',
            label: "Certificat médical de l'enfant",
            ownerName: 'Youssef Ben Ali',
            required: true,
            status: 'MANQUANT',
          },
        ],
        missingItems: ["Certificat médical pour l'enfant déclaré asthmatique"],
        internalNotes:
          'Demande recevable mais l’offre doit attendre le complément médical pour éviter une proposition incomplète.',
      },
      {
        id: 'adh-omni-004',
        externalRequestId: 'OMNI-ADH-2026-0145',
        source: 'OMNICARE',
        status: 'OFFRE_ENVOYEE',
        submittedAt: this.daysAgo(3, 2),
        updatedAt: this.daysAgo(1),
        applicantName: 'Mouna Gharbi',
        applicantEmail: 'mouna.gharbi@example.com',
        applicantPhone: '+216 98 654 220',
        address: 'Cité Ennasr 2',
        city: 'Ariana',
        employerName: 'Societe Poulina',
        profession: 'Responsable achats',
        annualSalary: 62000,
        companyEntryDate: '2016-03-01',
        familySituation: 'DIVORCE',
        requestedCoverage: ['SANTE_COMPLEMENTAIRE', 'INCAPACITE_INVALIDITE'],
        desiredEffectiveDate: this.dateOnly(this.daysFromNow(7)),
        currentHealthCoverage: 'Aucune complémentaire active',
        members: [
          {
            id: 'adh-omni-004-assure',
            relationship: 'ASSURE',
            fullName: 'Mouna Gharbi',
            birthDate: '1984-07-28',
            cin: '08407281',
            profession: 'Responsable achats',
            medical: {
              goodHealth: true,
              heightCm: 171,
              weightKg: 67,
            },
          },
          {
            id: 'adh-omni-004-enfant-1',
            relationship: 'ENFANT',
            fullName: 'Yasmine Gharbi',
            birthDate: '2014-04-03',
            medical: {
              goodHealth: true,
            },
          },
        ],
        documents: [
          {
            id: 'adh-omni-004-doc-identity',
            label: "Carte d'identité",
            ownerName: 'Mouna Gharbi',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-004-doc-child',
            label: "Extrait de naissance de l'enfant",
            ownerName: 'Yasmine Gharbi',
            required: true,
            status: 'RECU',
          },
          {
            id: 'adh-omni-004-doc-medical',
            label: 'Questionnaire médical',
            required: true,
            status: 'RECU',
          },
        ],
        missingItems: [],
        selectedCompanyId: 'star',
        selectedPlanTierName: 'Premium',
        lastAction: {
          type: 'OFFRE_ENVOYEE',
          at: this.daysAgo(1),
          label: 'Offre STAR Premium envoyée vers OmniCare',
        },
      },
    ];

    this.storage.setItem(STORAGE_KEYS.adhesionRequests, requests);
  }

  private seedCrossCompanyFraud(): void {
    const companies = this.storage.getItem<InsuranceCompany[]>(STORAGE_KEYS.companies, []);
    const companyById = new Map(companies.map((company) => [company.id, company]));
    const grouped = new Map<
      string,
      Array<{ company: InsuranceCompany; demande: DemandeRemboursement }>
    >();

    for (const company of companies) {
      const settings = this.readCompanySettings(company.id);

      if (!settings?.participatesInCrossFraudDetection) {
        continue;
      }

      const demandes = this.storage.getItem<DemandeRemboursement[]>(
        this.storage.companyKey(company.id, 'demandes'),
        [],
      );

      for (const demande of demandes) {
        const factureHash = this.hash(
          `${demande.patientName}|${demande.factureNumber}|${demande.factureDate}|${demande.totalAmount}`,
        );
        grouped.set(factureHash, [...(grouped.get(factureHash) ?? []), { company, demande }]);
      }
    }

    const alerts: CrossCompanyFraudAlert[] = Array.from(grouped.entries())
      .filter(([, cases]) => new Set(cases.map((item) => item.company.id)).size >= 2)
      .map(([factureHash, cases], index) => {
        const first = cases[0].demande;
        const latestSubmittedAt = cases
          .map(({ demande }) => demande.submittedAt)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

        return {
          id: `fraud-cross-${String(index + 1).padStart(3, '0')}`,
          type: 'DOUBLON_INTER_COMPAGNIE',
          patientHash: this.hash(first.patientName),
          factureHash,
          factureNumber: first.factureNumber,
          factureDate: first.factureDate,
          totalAmount: first.totalAmount,
          detectedAt: this.capToNow(this.addDays(new Date(latestSubmittedAt), 1)).toISOString(),
          status: index < 3 ? 'NOUVEAU' : index < 7 ? 'NOTIFIE' : 'CLOTURE',
          cases: cases.map(({ company, demande }) => ({
            companyId: company.id,
            companyName: companyById.get(company.id)?.name ?? company.name,
            demandeId: demande.id,
            submittedAt: demande.submittedAt,
            riskScore: demande.riskScore,
          })),
          recommendation:
            'Notifier les compagnies concernées, comparer les originaux et suspendre le remboursement en cas de doublon confirmé.',
        };
      });

    this.storage.setItem(this.crossCompanyFraudKey, alerts);
  }

  private marketSeedProfile(companyId: string, settings: CompanySettings): MarketSeedProfile {
    const profiles: Record<string, MarketSeedProfile> = {
      star: {
        annualClaims: 274,
        averageDelayDays: 6.4,
        delayJitterDays: 2.8,
        approvalRate: 0.84,
        defaultSlaDays: 10,
      },
      gat: {
        annualClaims: 138,
        averageDelayDays: 7.6,
        delayJitterDays: 3.1,
        approvalRate: 0.82,
        defaultSlaDays: 9,
      },
      bh: {
        annualClaims: 126,
        averageDelayDays: 12.4,
        delayJitterDays: 4.2,
        approvalRate: 0.79,
        defaultSlaDays: 8,
      },
      ami: {
        annualClaims: 116,
        averageDelayDays: 11.6,
        delayJitterDays: 3.7,
        approvalRate: 0.8,
        defaultSlaDays: 9,
      },
      maghrebia: {
        annualClaims: 76,
        averageDelayDays: 7.2,
        delayJitterDays: 2.8,
        approvalRate: 0.83,
        defaultSlaDays: 10,
      },
      'maghrebia-vie': {
        annualClaims: 62,
        averageDelayDays: 8.2,
        delayJitterDays: 3,
        approvalRate: 0.81,
        defaultSlaDays: 10,
      },
      comar: {
        annualClaims: 48,
        averageDelayDays: 13.2,
        delayJitterDays: 4,
        approvalRate: 0.78,
        defaultSlaDays: 12,
      },
      carte: {
        annualClaims: 32,
        averageDelayDays: 9.6,
        delayJitterDays: 3.2,
        approvalRate: 0.8,
        defaultSlaDays: 11,
      },
    };

    return (
      profiles[companyId] ?? {
        annualClaims: settings.participatesInMarketAnalytics ? 58 : 24,
        averageDelayDays: settings.defaultSlaDays - 1,
        delayJitterDays: 3,
        approvalRate: 0.81,
        defaultSlaDays: settings.defaultSlaDays,
      }
    );
  }

  private optOutAnnualClaims(
    companyId: string,
    settings: CompanySettings,
    profile: MarketSeedProfile,
  ): number {
    if (settings.participatesInCrossFraudDetection || companyId === 'carte') {
      return profile.annualClaims;
    }

    return 0;
  }

  private defaultSlaDaysForCompany(companyId: string): number {
    const defaults: Record<string, number> = {
      ami: 9,
      bh: 8,
      carte: 11,
      comar: 12,
      gat: 9,
      maghrebia: 10,
      'maghrebia-vie': 10,
      star: 10,
    };

    return defaults[companyId] ?? 10;
  }

  private genericPlanTiers(company: InsuranceCompany, profile: MarketSeedProfile): PlanTier[] {
    const premiumLift = profile.annualClaims >= 100 ? 14 : 6;

    return [
      this.planTier(
        `${company.id}-basique`,
        company.id,
        'Basique',
        'Couverture essentielle',
        54 + premiumLift,
        25,
      ),
      this.planTier(
        `${company.id}-confort`,
        company.id,
        'Confort',
        'Couverture équilibrée',
        106 + premiumLift,
        40,
      ),
      this.planTier(
        `${company.id}-premium`,
        company.id,
        'Premium',
        'Couverture renforcée',
        196 + premiumLift,
        60,
      ),
    ];
  }

  private genericCorporateContracts(
    company: InsuranceCompany,
    planTiers: PlanTier[],
  ): CorporateContract[] {
    const employers = this.companyEmployerSeeds(company.id);
    const tierIds = planTiers.map((tier) => tier.id);

    return employers.slice(0, 2).map((employer, index) => ({
      id: `${company.id}-contract-${index + 1}`,
      companyId: company.id,
      employerName: employer.name,
      employerSector: employer.sector,
      hrContactName: employer.hrName,
      hrContactEmail: employer.hrEmail,
      contractStartDate: this.dateOnly(this.daysAgo(240 - index * 41)),
      contractEndDate: this.dateOnly(this.daysFromNow(125 + index * 80)),
      renewalNoticeDate: this.dateOnly(this.daysFromNow(65 + index * 40)),
      totalEmployees: employer.totalEmployees,
      enrolledEmployees: Math.round(employer.totalEmployees * employer.enrollmentRate),
      annualPremium: employer.annualPremium,
      availablePlanTiers: index === 0 ? tierIds.slice(1) : tierIds,
      claimsThisYear: 0,
      reimbursedThisYear: 0,
      claimsRatio: 0,
      status: index === 1 ? 'EXPIRATION_PROCHE' : 'ACTIF',
    }));
  }

  private genericNetwork(company: InsuranceCompany): ProviderNetworkEntry[] {
    return [
      this.provider(`${company.id}-net-001`, company.id, 'Clinique El Amen', 'CLINIQUE', ['Chirurgie', 'Hospitalisation'], 'Tunis', 'Tunis', 'AGREE', true, 0, 0),
      this.provider(`${company.id}-net-002`, company.id, 'Laboratoire Pasteur Tunis', 'LABORATOIRE', ['Biologie médicale'], 'Tunis', 'Tunis', 'AGREE', true, 0, 0),
      this.provider(`${company.id}-net-003`, company.id, 'Centre Imagerie du Lac', 'CLINIQUE', ['Radiologie', 'Scanner'], 'Tunis', 'Tunis', 'AGREE', true, 0, 0),
      this.provider(`${company.id}-net-004`, company.id, 'Centre Kiné El Menzah', 'KINE', ['Rééducation'], 'Ariana', 'Ariana', 'AGREE', false, 0, 0),
      this.provider(`${company.id}-net-005`, company.id, 'Clinique XYZ', 'CLINIQUE', ['Chirurgie générale'], 'Tunis', 'Tunis', 'HORS_RESEAU', false, 0, 0),
    ];
  }

  private companyEmployerSeeds(companyId: string): Array<{
    name: string;
    sector: string;
    hrName: string;
    hrEmail: string;
    totalEmployees: number;
    enrollmentRate: number;
    annualPremium: number;
  }> {
    const employers: Record<string, Array<{
      name: string;
      sector: string;
      hrName: string;
      hrEmail: string;
      totalEmployees: number;
      enrollmentRate: number;
      annualPremium: number;
    }>> = {
      ami: [
        { name: 'La Poste Tunisienne', sector: 'Services publics', hrName: 'Henda Mami', hrEmail: 'henda.mami@poste.tn', totalEmployees: 920, enrollmentRate: 0.76, annualPremium: 728000 },
        { name: 'Groupe OneTech', sector: 'Industrie', hrName: 'Sofiene Ayadi', hrEmail: 'sofiene.ayadi@onetech.tn', totalEmployees: 610, enrollmentRate: 0.68, annualPremium: 512000 },
      ],
      bh: [
        { name: 'BH Bank', sector: 'Banque', hrName: 'Amel Letaief', hrEmail: 'amel.letaief@bhbank.tn', totalEmployees: 1100, enrollmentRate: 0.72, annualPremium: 844000 },
        { name: 'Société El Fouledh', sector: 'Industrie', hrName: 'Khalil Toumi', hrEmail: 'khalil.toumi@elfouledh.tn', totalEmployees: 730, enrollmentRate: 0.64, annualPremium: 468000 },
      ],
      carte: [
        { name: 'Office National du Tourisme', sector: 'Tourisme', hrName: 'Sana Derbel', hrEmail: 'sana.derbel@ontt.tn', totalEmployees: 410, enrollmentRate: 0.61, annualPremium: 218000 },
        { name: 'Groupe Mabrouk', sector: 'Distribution', hrName: 'Houssem Ben Salem', hrEmail: 'houssem.bensalem@mabrouk.tn', totalEmployees: 690, enrollmentRate: 0.59, annualPremium: 392000 },
      ],
      gat: [
        { name: 'Société Tunisienne de Banque', sector: 'Banque', hrName: 'Meriem Dridi', hrEmail: 'meriem.dridi@stb.com.tn', totalEmployees: 980, enrollmentRate: 0.74, annualPremium: 781000 },
        { name: 'Office des Céréales', sector: 'Agroalimentaire', hrName: 'Fethi Chouchane', hrEmail: 'fethi.chouchane@oc.tn', totalEmployees: 520, enrollmentRate: 0.66, annualPremium: 336000 },
      ],
      maghrebia: [
        { name: 'Groupe Délice', sector: 'Agroalimentaire', hrName: 'Amina Bouaziz', hrEmail: 'amina.bouaziz@delice.tn', totalEmployees: 740, enrollmentRate: 0.69, annualPremium: 498000 },
        { name: 'Université Centrale', sector: 'Education', hrName: 'Rached Gharbi', hrEmail: 'rached.gharbi@uc.tn', totalEmployees: 360, enrollmentRate: 0.63, annualPremium: 176000 },
      ],
      'maghrebia-vie': [
        { name: 'Tunisie Leasing', sector: 'Finance', hrName: 'Nesrine Mansouri', hrEmail: 'nesrine.mansouri@tl.tn', totalEmployees: 330, enrollmentRate: 0.71, annualPremium: 208000 },
        { name: 'Société Monoprix', sector: 'Distribution', hrName: 'Lotfi Guesmi', hrEmail: 'lotfi.guesmi@monoprix.tn', totalEmployees: 840, enrollmentRate: 0.58, annualPremium: 474000 },
      ],
    };

    return (
      employers[companyId] ?? [
        { name: 'Groupe Tunisien Partenaire', sector: 'Services', hrName: 'Nadia Kacem', hrEmail: `rh@${companyId}.tn`, totalEmployees: 420, enrollmentRate: 0.62, annualPremium: 240000 },
        { name: 'Société Méditerranée', sector: 'Industrie', hrName: 'Walid Mejri', hrEmail: `walid.mejri@${companyId}.tn`, totalEmployees: 510, enrollmentRate: 0.6, annualPremium: 286000 },
      ]
    );
  }

  private categorySeedProfiles(): Array<WeightedSeedChoice<CategorySeedProfile>> {
    return [
      { value: { category: 'CONSULTATION', weight: 24, minAmount: 40, maxAmount: 120, description: 'Consultation médicale', providerType: 'MEDECIN' }, weight: 24 },
      { value: { category: 'BIOLOGIE', weight: 18, minAmount: 30, maxAmount: 200, description: 'Analyses biologiques', providerType: 'AUTRE' }, weight: 18 },
      { value: { category: 'RADIOLOGIE', weight: 14, minAmount: 80, maxAmount: 400, description: 'Imagerie médicale', providerType: 'CLINIQUE' }, weight: 14 },
      { value: { category: 'KINESITHERAPIE', weight: 9, minAmount: 200, maxAmount: 1200, description: 'Séances de kinésithérapie', providerType: 'KINE' }, weight: 9 },
      { value: { category: 'DENTAIRE', weight: 7, minAmount: 120, maxAmount: 900, description: 'Soins dentaires', providerType: 'AUTRE' }, weight: 7 },
      { value: { category: 'SOINS_INFIRMIERS', weight: 6, minAmount: 45, maxAmount: 250, description: 'Soins infirmiers', providerType: 'INFIRMIER' }, weight: 6 },
      { value: { category: 'OPTIQUE', weight: 5, minAmount: 150, maxAmount: 700, description: 'Optique médicale', providerType: 'AUTRE' }, weight: 5 },
      { value: { category: 'URGENCES', weight: 5, minAmount: 120, maxAmount: 900, description: 'Prise en charge urgences', providerType: 'CLINIQUE' }, weight: 5 },
      { value: { category: 'HOSPITALISATION', weight: 4, minAmount: 2000, maxAmount: 20000, description: 'Hospitalisation', providerType: 'CLINIQUE' }, weight: 4 },
      { value: { category: 'CHIRURGIE', weight: 3, minAmount: 1500, maxAmount: 12000, description: 'Acte chirurgical', providerType: 'CLINIQUE' }, weight: 3 },
      { value: { category: 'MATERNITE', weight: 3, minAmount: 800, maxAmount: 4500, description: 'Maternité', providerType: 'CLINIQUE' }, weight: 3 },
      { value: { category: 'PSYCHIATRIE', weight: 2, minAmount: 70, maxAmount: 250, description: 'Consultation psychiatrie', providerType: 'MEDECIN' }, weight: 2 },
      { value: { category: 'AUTRE', weight: 2, minAmount: 30, maxAmount: 500, description: 'Autre acte médical', providerType: 'AUTRE' }, weight: 2 },
    ];
  }

  private syntheticStatus(
    approvalRate: number,
    rng: () => number,
  ): DemandeRemboursement['status'] {
    const roll = rng();

    if (roll < approvalRate) {
      return this.weightedChoice(
        [
          { value: 'APPROUVEE' as const, weight: 58 },
          { value: 'APPROUVEE_PARTIELLEMENT' as const, weight: 20 },
          { value: 'APPROUVEE_AUTO' as const, weight: 7 },
        ],
        rng,
      );
    }

    if (roll < approvalRate + 0.1) {
      return 'REFUSEE';
    }

    return this.weightedChoice(
      [
        { value: 'EN_EXAMEN' as const, weight: 6 },
        { value: 'SOUMISE' as const, weight: 3 },
        { value: 'DOCUMENTS_INCOMPLETS' as const, weight: 2 },
      ],
      rng,
    );
  }

  private syntheticApprovedAmount(
    status: DemandeRemboursement['status'],
    totalAmount: number,
    rng: () => number,
  ): number | undefined {
    if (status === 'APPROUVEE_PARTIELLEMENT') {
      return this.roundTnd(totalAmount * (0.4 + rng() * 0.3));
    }

    if (status === 'APPROUVEE' || status === 'APPROUVEE_AUTO') {
      return totalAmount;
    }

    return undefined;
  }

  private syntheticFlags(
    category: ActCategory,
    totalAmount: number,
    providerInNetwork: boolean,
    settings: CompanySettings,
    rng: () => number,
  ): DemandeRemboursement['flags'] {
    const flags: DemandeRemboursement['flags'] = [];
    const highAmount = totalAmount >= 3000;
    const priorAuthSensitive = settings.priorAuthCategories.includes(category);
    const flagProbability =
      0.055 +
      (highAmount ? 0.07 : 0) +
      (totalAmount >= 8000 ? 0.03 : 0) +
      (!providerInNetwork ? 0.12 : 0) +
      (priorAuthSensitive ? 0.035 : 0);

    if (rng() > flagProbability) {
      return flags;
    }

    if (!providerInNetwork) {
      flags.push('PRESTATAIRE_HORS_RESEAU');
    }

    if (highAmount) {
      flags.push(totalAmount >= 8000 ? 'SEUIL_REASSURANCE' : 'MONTANT_ELEVE');
    }

    if (priorAuthSensitive && rng() < 0.45) {
      flags.push('AUTORISATION_MANQUANTE');
    }

    if (flags.length === 0) {
      flags.push(
        this.weightedChoice(
          [
            { value: 'DOCUMENTS_MANQUANTS' as const, weight: 4 },
            { value: 'DELAI_SOUMISSION' as const, weight: 3 },
            { value: 'MONTANT_ELEVE' as const, weight: 2 },
          ],
          rng,
        ),
      );
    }

    return Array.from(new Set(flags));
  }

  private riskScoreForClaim(
    flags: DemandeRemboursement['flags'],
    totalAmount: number,
    providerInNetwork: boolean,
    rng: () => number,
  ): DemandeRemboursement['riskScore'] {
    if (
      flags.includes('DOUBLON_SUSPECT') ||
      flags.includes('SEUIL_REASSURANCE') ||
      flags.includes('AUTORISATION_MANQUANTE') ||
      (!providerInNetwork && totalAmount >= 1000)
    ) {
      return 'ELEVE';
    }

    if (flags.length > 0 || totalAmount >= 5000 || rng() < 0.08) {
      return 'MOYEN';
    }

    return 'FAIBLE';
  }

  private rejectionReasonForFlags(
    flags: DemandeRemboursement['flags'],
    rng: () => number,
  ): NonNullable<DemandeRemboursement['rejectionReason']> {
    if (flags.includes('DOUBLON_SUSPECT')) {
      return 'DOUBLON';
    }

    if (flags.includes('AUTORISATION_MANQUANTE')) {
      return 'AUTORISATION_MANQUANTE';
    }

    if (flags.includes('PRESTATAIRE_HORS_RESEAU')) {
      return 'PRESTATAIRE_NON_AGREE';
    }

    return this.weightedChoice(
      [
        { value: 'PLAFOND_ATTEINT' as const, weight: 4 },
        { value: 'MONTANT_NON_CONFORME' as const, weight: 3 },
        { value: 'DOCUMENT_MANQUANT' as const, weight: 2 },
        { value: 'ACTE_NON_COUVERT' as const, weight: 1 },
      ],
      rng,
    );
  }

  private sourceForMonth(monthIndex: number, totalMonths: number, rng: () => number): ClaimSource {
    const progress = totalMonths <= 1 ? 1 : monthIndex / (totalMonths - 1);
    const omnicareShare = 0.2 + progress * 0.25;
    const remainder = 1 - omnicareShare;

    return this.weightedChoice(
      [
        { value: 'OMNICARE' as const, weight: omnicareShare },
        { value: 'MANUEL' as const, weight: remainder * (0.42 - progress * 0.1) },
        { value: 'WEBSITE' as const, weight: remainder * (0.22 + progress * 0.06) },
        { value: 'EMAIL' as const, weight: remainder * (0.2 - progress * 0.04) },
        { value: 'IMPORT_CSV' as const, weight: remainder * (0.16 + progress * 0.08) },
      ],
      rng,
    );
  }

  private sampleDelayDays(
    profile: MarketSeedProfile,
    category: ActCategory,
    totalAmount: number,
    rng: () => number,
  ): number {
    const jitter = (rng() - 0.5) * profile.delayJitterDays * 2;
    const complexityPenalty = this.isHighCostCategory(category) ? 1.4 : totalAmount >= 3000 ? 0.8 : 0;

    return Math.max(1, Math.round(profile.averageDelayDays + jitter + complexityPenalty));
  }

  private distributeClaimsByMonth(totalClaims: number, months: Date[]): number[] {
    const weights = months.map((month, index) => {
      const monthNumber = month.getMonth();
      const summerDip = monthNumber === 6 ? 0.86 : monthNumber === 7 ? 0.82 : monthNumber === 5 ? 0.94 : 1;

      return Math.pow(1.015, index) * summerDip;
    });
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const rawCounts = weights.map((weight) => (totalClaims * weight) / totalWeight);
    const counts = rawCounts.map((count) => Math.floor(count));
    let remaining = totalClaims - counts.reduce((total, count) => total + count, 0);
    const fractions = rawCounts
      .map((count, index) => ({ index, fraction: count - Math.floor(count) }))
      .sort((left, right) => right.fraction - left.fraction);

    for (const item of fractions) {
      if (remaining <= 0) {
        break;
      }

      counts[item.index] += 1;
      remaining -= 1;
    }

    return counts;
  }

  private randomDateInMonth(monthStart: Date, rng: () => number): Date {
    const now = new Date();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const maxDay = isCurrentMonth ? Math.max(1, Math.min(daysInMonth, now.getDate())) : daysInMonth;
    let date = new Date(
      year,
      month,
      1 + Math.floor(rng() * maxDay),
      8 + Math.floor(rng() * 10),
      Math.floor(rng() * 60),
      0,
      0,
    );

    if (date.getTime() > now.getTime()) {
      date = new Date(now.getTime() - Math.floor(1 + rng() * 12) * 3_600_000);
    }

    return date;
  }

  private duplicateFactureDate(monthStart: Date, pairIndex: number): Date {
    const now = new Date();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const maxDay = new Date(year, month + 1, 0).getDate();
    let date = new Date(year, month, Math.min(maxDay, 6 + pairIndex * 2), 10, 0, 0, 0);

    if (date.getTime() > now.getTime()) {
      date = this.addDays(now, -(2 + pairIndex));
    }

    return date;
  }

  private trailingMonthStarts(count: number): Date[] {
    const now = new Date();

    return Array.from(
      { length: count },
      (_, index) => new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1, 12, 0, 0, 0),
    );
  }

  private providerNameForCategory(
    category: ActCategory,
    providerInNetwork: boolean,
    rng: () => number,
  ): string {
    const inNetwork: Record<ActCategory, string[]> = {
      AUTRE: ['Centre Médical Ibn Khaldoun', 'Cabinet Paramédical El Manar'],
      BIOLOGIE: ['Laboratoire Pasteur Tunis', 'Laboratoire Ibn Sina', 'Laboratoire Central Sfax'],
      CHIRURGIE: ['Clinique El Amen', 'Clinique Carthage', 'Polyclinique du Sahel'],
      CONSULTATION: ['Cabinet Dr. Trabelsi', 'Cabinet Dr. Gharbi', 'Cabinet Dr. Ben Romdhane'],
      DENTAIRE: ['Cabinet Dentaire Dr. Kallel', 'Centre Dentaire Ennasr'],
      HOSPITALISATION: ['Clinique El Amen', 'Polyclinique du Sahel', 'Clinique El Manar'],
      KINESITHERAPIE: ['Centre Kiné El Menzah', 'Centre Rééducation Mutuelleville'],
      MATERNITE: ['Clinique les Jasmins', 'Clinique El Manar'],
      OPTIQUE: ['Centre Optique Ennasr', 'Optique Lafayette'],
      PSYCHIATRIE: ['Cabinet Dr. Miled', 'Cabinet Dr. Ferjani'],
      RADIOLOGIE: ['Centre Imagerie du Lac', 'Centre Radiologie Ariana'],
      SOINS_INFIRMIERS: ['Cabinet Infirmier Saidi', 'Soins Infirmiers El Mourouj'],
      URGENCES: ['Clinique El Amen', 'Polyclinique du Sahel'],
    };
    const outOfNetwork = ['Clinique XYZ', 'Cabinet Médical Sans Agrément', 'Centre Paramédical El Badr'];
    const names = providerInNetwork ? inNetwork[category] : outOfNetwork;

    return this.pick(names, rng) ?? names[0];
  }

  private tunisianPatientName(rng: () => number): string {
    const firstNames = [
      'Ahmed',
      'Sonia',
      'Karim',
      'Imen',
      'Hichem',
      'Leila',
      'Nabil',
      'Fatma',
      'Rania',
      'Mehdi',
      'Mouna',
      'Tarek',
      'Ines',
      'Omar',
      'Asma',
      'Bilel',
      'Syrine',
      'Walid',
      'Nadia',
      'Youssef',
      'Marwa',
      'Anis',
      'Nour',
      'Firas',
      'Rim',
      'Olfa',
      'Mourad',
      'Emna',
      'Kais',
      'Hela',
    ];
    const lastNames = [
      'Ben Ali',
      'Gharbi',
      'Mansour',
      'Trabelsi',
      'Bouzid',
      'Brahmi',
      'Karoui',
      'Jaziri',
      'Kacem',
      'Lahmar',
      'Ben Romdhane',
      'Ayari',
      'Chebbi',
      'Saidi',
      'Sassi',
      'Mestiri',
      'Boukhris',
      'Laabidi',
      'Masmoudi',
      'Zribi',
      'Mami',
      'Dhaouadi',
      'Oueslati',
      'Khelifi',
      'Haddad',
      'Mzoughi',
    ];

    return `${this.pick(firstNames, rng)} ${this.pick(lastNames, rng)}`;
  }

  private recomputeCompanyClaimStats(companyId: string, demandes: DemandeRemboursement[]): void {
    const currentYear = new Date().getFullYear();
    const currentYearDemandes = demandes.filter(
      (demande) => new Date(demande.submittedAt).getFullYear() === currentYear,
    );
    const contracts = this.storage.getItem<CorporateContract[]>(
      this.storage.companyKey(companyId, 'contracts'),
      [],
    );
    const adherents = this.storage.getItem<Adherent[]>(this.storage.companyKey(companyId, 'adherents'), []);
    const network = this.storage.getItem<ProviderNetworkEntry[]>(
      this.storage.companyKey(companyId, 'network'),
      [],
    );

    if (contracts.length > 0) {
      this.storage.setItem(
        this.storage.companyKey(companyId, 'contracts'),
        contracts.map((contract) => {
          const related = currentYearDemandes.filter(
            (demande) =>
              demande.contractId === contract.id || demande.employerName === contract.employerName,
          );
          const reimbursedThisYear = this.sumApproved(related);

          return {
            ...contract,
            claimsThisYear: related.length,
            reimbursedThisYear,
            claimsRatio:
              contract.annualPremium > 0
                ? Math.round((reimbursedThisYear / contract.annualPremium) * 1000) / 1000
                : 0,
          };
        }),
      );
    }

    if (adherents.length > 0) {
      this.storage.setItem(
        this.storage.companyKey(companyId, 'adherents'),
        adherents.map((adherent) => {
          const related = currentYearDemandes.filter(
            (demande) => demande.patientMemberId === adherent.membershipId,
          );

          return {
            ...adherent,
            totalClaimsThisYear: related.length,
            totalReimbursedThisYear: this.sumApproved(related),
          };
        }),
      );
    }

    if (network.length > 0) {
      this.storage.setItem(
        this.storage.companyKey(companyId, 'network'),
        network.map((provider) => {
          const related = currentYearDemandes.filter(
            (demande) => demande.providerName === provider.providerName,
          );

          return {
            ...provider,
            claimsThisYear: related.length,
            totalReimbursedThisYear: this.sumApproved(related),
          };
        }),
      );
    }
  }

  private sumApproved(demandes: DemandeRemboursement[]): number {
    return Math.round(demandes.reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0));
  }

  private readCompanySettings(companyId: string): CompanySettings | null {
    return this.storage.getItem<CompanySettings | null>(
      this.storage.companyKey(companyId, 'settings'),
      null,
    );
  }

  private randomAmount(category: CategorySeedProfile, rng: () => number): number {
    const skew = Math.pow(rng(), category.maxAmount >= 1000 ? 1.7 : 1.25);
    const raw = category.minAmount + (category.maxAmount - category.minAmount) * skew;

    return this.roundTnd(raw);
  }

  private roundTnd(value: number): number {
    const step = value >= 1000 ? 50 : 5;

    return Math.max(step, Math.round(value / step) * step);
  }

  private isHighCostCategory(category: ActCategory): boolean {
    return category === 'CHIRURGIE' || category === 'HOSPITALISATION' || category === 'MATERNITE';
  }

  private isSyntheticMarketClaim(id: string): boolean {
    return id.includes('-synthetic-') || id.includes('-dup-');
  }

  private weightedChoice<T>(choices: Array<WeightedSeedChoice<T>>, rng: () => number): T {
    const totalWeight = choices.reduce((total, choice) => total + choice.weight, 0);
    let threshold = rng() * totalWeight;

    for (const choice of choices) {
      threshold -= choice.weight;

      if (threshold <= 0) {
        return choice.value;
      }
    }

    return choices[choices.length - 1].value;
  }

  private pick<T>(items: T[], rng: () => number): T | undefined {
    if (items.length === 0) {
      return undefined;
    }

    return items[Math.floor(rng() * items.length)];
  }

  private seededRandom(seed: string): () => number {
    let state = 0x811c9dc5;

    for (let index = 0; index < seed.length; index += 1) {
      state ^= seed.charCodeAt(index);
      state = Math.imul(state, 0x01000193);
    }

    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private capToNow(date: Date): Date {
    const now = new Date();

    return date.getTime() > now.getTime() ? now : date;
  }

  private dateFromDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private yearMonth(date: Date): string {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private responderName(companyId: string): string {
    const names: Record<string, string> = {
      ami: 'Hatem Triki',
      bh: 'Sonia Mestiri',
      carte: 'Karim Saidi',
      comar: 'Sami Bouzid',
      gat: 'Leila Kammoun',
      maghrebia: 'Nadia Karray',
      'maghrebia-vie': 'Rim Baccouche',
      star: 'Ahmed Direche',
    };

    return names[companyId] ?? 'Admin compagnie';
  }

  private starPlanTiers(): PlanTier[] {
    return [
      this.planTier('star-basique', 'star', 'Basique', 'Couverture essentielle', 62, 25),
      this.planTier('star-confort', 'star', 'Confort', 'Couverture équilibrée recommandée', 118, 40),
      this.planTier('star-premium', 'star', 'Premium', 'Couverture renforcée', 210, 60),
    ];
  }

  private comarPlanTiers(): PlanTier[] {
    return [
      this.planTier('comar-basique', 'comar', 'Basique', 'Couverture essentielle', 58, 25),
      this.planTier('comar-confort', 'comar', 'Confort', 'Couverture équilibrée', 112, 40),
    ];
  }

  private starCorporateContracts(planTiers: PlanTier[]): CorporateContract[] {
    const [basique, confort, premium] = planTiers;

    return [
      {
        id: 'star-contract-tt',
        companyId: 'star',
        employerName: 'Tunisie Telecom',
        employerSector: 'Télécommunications',
        hrContactName: 'Nadia Jaziri',
        hrContactEmail: 'nadia.jaziri@tunisietelecom.tn',
        contractStartDate: this.dateOnly(this.daysAgo(145)),
        contractEndDate: this.dateOnly(this.daysFromNow(220)),
        renewalNoticeDate: this.dateOnly(this.daysFromNow(160)),
        totalEmployees: 847,
        enrolledEmployees: 712,
        annualPremium: 966045,
        availablePlanTiers: [confort.id, premium.id],
        claimsThisYear: 142,
        reimbursedThisYear: 312400,
        claimsRatio: 0.323,
        status: 'ACTIF',
      },
      {
        id: 'star-contract-biat',
        companyId: 'star',
        employerName: 'BIAT',
        employerSector: 'Banque',
        hrContactName: 'Rim Kallel',
        hrContactEmail: 'rim.kallel@biat.com.tn',
        contractStartDate: this.dateOnly(this.daysAgo(318)),
        contractEndDate: this.dateOnly(this.daysFromNow(107)),
        renewalNoticeDate: this.dateOnly(this.daysFromNow(47)),
        totalEmployees: 562,
        enrolledEmployees: 489,
        annualPremium: 304236,
        availablePlanTiers: [basique.id],
        claimsThisYear: 51,
        reimbursedThisYear: 89200,
        claimsRatio: 0.293,
        status: 'EXPIRATION_PROCHE',
      },
      {
        id: 'star-contract-poulina',
        companyId: 'star',
        employerName: 'Société Poulina',
        employerSector: 'Agroalimentaire',
        hrContactName: 'Walid Chebbi',
        hrContactEmail: 'walid.chebbi@poulina.com.tn',
        contractStartDate: this.dateOnly(this.daysAgo(145)),
        contractEndDate: this.dateOnly(this.daysFromNow(220)),
        renewalNoticeDate: this.dateOnly(this.daysFromNow(160)),
        totalEmployees: 1243,
        enrolledEmployees: 1098,
        annualPremium: 2694120,
        availablePlanTiers: [premium.id],
        claimsThisYear: 238,
        reimbursedThisYear: 876500,
        claimsRatio: 0.325,
        status: 'ACTIF',
      },
    ];
  }

  private comarCorporateContracts(planTiers: PlanTier[]): CorporateContract[] {
    const [, confort] = planTiers;

    return [
      {
        id: 'comar-contract-steg',
        companyId: 'comar',
        employerName: 'STEG',
        employerSector: 'Énergie',
        hrContactName: 'Mouna Saidi',
        hrContactEmail: 'mouna.saidi@steg.com.tn',
        contractStartDate: this.dateOnly(this.daysAgo(145)),
        contractEndDate: this.dateOnly(this.daysFromNow(220)),
        renewalNoticeDate: this.dateOnly(this.daysFromNow(160)),
        totalEmployees: 1500,
        enrolledEmployees: 1284,
        annualPremium: 1728000,
        availablePlanTiers: [confort.id],
        claimsThisYear: 186,
        reimbursedThisYear: 476300,
        claimsRatio: 0.276,
        status: 'ACTIF',
      },
    ];
  }

  private starAdherents(): Adherent[] {
    return [
      this.adherent('star-adh-001', 'star', 'Ahmed Ben Ali', 'AH-789', 'POL-2026-001', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 4, 6200, 'OMNICARE', 'star-contract-tt', 'Tunisie Telecom', 'TT-4521', 'Cadre technique'),
      this.adherent('star-adh-002', 'star', 'Sonia Gharbi', 'SG-456', 'POL-2026-082', 'star-premium', 'Premium', 'INDIVIDUEL', 'VERIFIE', 8, 12400, 'OMNICARE'),
      this.adherent('star-adh-003', 'star', 'Karim Mansour', 'KM-321', 'POL-2025-451', 'star-basique', 'Basique', 'GROUPE', 'EN_ATTENTE', 0, 0, 'IMPORT_CSV', 'star-contract-biat', 'BIAT', 'BIAT-1038', 'Agence centrale'),
      this.adherent('star-adh-004', 'star', 'Imen Trabelsi', 'IT-214', 'POL-2026-104', 'star-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 2, 380, 'MANUEL'),
      this.adherent('star-adh-005', 'star', 'Hichem Bouzid', 'HB-118', 'POL-2026-118', 'star-basique', 'Basique', 'INDIVIDUEL', 'VERIFIE', 1, 45, 'OMNICARE'),
      this.adherent('star-adh-006', 'star', 'Leila Brahmi', 'LB-442', 'POL-2026-442', 'star-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 6, 950, 'WEBSITE'),
      this.adherent('star-adh-007', 'star', 'Nabil Karoui', 'NK-220', 'POL-2026-220', 'star-basique', 'Basique', 'GROUPE', 'VERIFIE', 3, 410, 'EMAIL', 'star-contract-biat', 'BIAT', 'BIAT-2204', 'Back office'),
      this.adherent('star-adh-008', 'star', 'Fatma Mansour', 'FM-908', 'POL-2026-908', 'star-premium', 'Premium', 'GROUPE', 'VERIFIE', 5, 8400, 'IMPORT_CSV', 'star-contract-poulina', 'Société Poulina', 'POU-9081', 'Direction qualité'),
      this.adherent('star-adh-009', 'star', 'Fatma Karoui', 'FK-541', 'POL-2026-541', 'star-premium', 'Premium', 'INDIVIDUEL', 'VERIFIE', 2, 1200, 'OMNICARE'),
      this.adherent('star-adh-010', 'star', 'Nabil Ferchichi', 'NF-332', 'POL-2026-332', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 1, 0, 'WEBSITE', 'star-contract-tt', 'Tunisie Telecom', 'TT-7712', 'Maintenance'),
      this.adherent('star-adh-011', 'star', 'Salma Bouzayane', 'SB-772', 'POL-2026-772', 'star-premium', 'Premium', 'INDIVIDUEL', 'VERIFIE', 7, 18600, 'OMNICARE'),
      this.adherent('star-adh-012', 'star', 'Mehdi Trabelsi', 'MT-619', 'POL-2026-619', 'star-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 3, 760, 'OMNICARE'),
      this.adherent('star-adh-013', 'star', 'Mohamed Jlassi', 'MJ-201', 'POL-2026-201', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 2, 320, 'IMPORT_CSV', 'star-contract-tt', 'Tunisie Telecom', 'TT-2014', 'Support client'),
      this.adherent('star-adh-014', 'star', 'Amira Kacem', 'AK-734', 'POL-2026-734', 'star-premium', 'Premium', 'GROUPE', 'VERIFIE', 4, 2400, 'OMNICARE', 'star-contract-poulina', 'Société Poulina', 'POU-7342', 'Achats'),
      this.adherent('star-adh-015', 'star', 'Youssef Lahmar', 'YL-553', 'POL-2026-553', 'star-basique', 'Basique', 'INDIVIDUEL', 'REJETE', 0, 0, 'MANUEL'),
      this.adherent('star-adh-016', 'star', 'Rania Ben Romdhane', 'RR-672', 'POL-2026-672', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 6, 1580, 'EMAIL', 'star-contract-biat', 'BIAT', 'BIAT-6729', 'Risques'),
      this.adherent('star-adh-017', 'star', 'Bilel Ayari', 'BA-428', 'POL-2026-428', 'star-premium', 'Premium', 'GROUPE', 'VERIFIE', 1, 180, 'OMNICARE', 'star-contract-tt', 'Tunisie Telecom', 'TT-4285', 'Réseau'),
      this.adherent('star-adh-018', 'star', 'Mouna Jaziri', 'MJZ-905', 'POL-2026-905', 'star-confort', 'Confort', 'INDIVIDUEL', 'EN_ATTENTE', 0, 0, 'WEBSITE'),
      this.adherent('star-adh-019', 'star', 'Tarek Chebbi', 'TC-810', 'POL-2026-810', 'star-basique', 'Basique', 'GROUPE', 'VERIFIE', 2, 260, 'IMPORT_CSV', 'star-contract-poulina', 'Société Poulina', 'POU-8106', 'Production'),
      this.adherent('star-adh-020', 'star', 'Ines Oueslati', 'IO-347', 'POL-2026-347', 'star-premium', 'Premium', 'INDIVIDUEL', 'VERIFIE', 9, 5800, 'OMNICARE'),
      this.adherent('star-adh-021', 'star', 'Firas Khelifi', 'FKH-129', 'POL-2026-129', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 3, 870, 'EMAIL', 'star-contract-biat', 'BIAT', 'BIAT-1297', 'Crédit'),
      this.adherent('star-adh-022', 'star', 'Syrine Haddad', 'SH-482', 'POL-2026-482', 'star-premium', 'Premium', 'GROUPE', 'VERIFIE', 4, 1320, 'OMNICARE', 'star-contract-tt', 'Tunisie Telecom', 'TT-4820', 'Marketing'),
      this.adherent('star-adh-023', 'star', 'Walid Mzoughi', 'WM-260', 'POL-2026-260', 'star-basique', 'Basique', 'INDIVIDUEL', 'VERIFIE', 1, 60, 'MANUEL'),
      this.adherent('star-adh-024', 'star', 'Nadia Saidi', 'NS-707', 'POL-2026-707', 'star-confort', 'Confort', 'GROUPE', 'EN_ATTENTE', 0, 0, 'IMPORT_CSV', 'star-contract-poulina', 'Société Poulina', 'POU-7075', 'RH'),
      this.adherent('star-adh-025', 'star', 'Omar Sassi', 'OS-994', 'POL-2026-994', 'star-premium', 'Premium', 'INDIVIDUEL', 'VERIFIE', 5, 2900, 'WEBSITE'),
      this.adherent('star-adh-026', 'star', 'Asma Ben Youssef', 'ABY-447', 'POL-2026-447', 'star-confort', 'Confort', 'GROUPE', 'VERIFIE', 2, 540, 'OMNICARE', 'star-contract-tt', 'Tunisie Telecom', 'TT-4471', 'Finance'),
      this.adherent('star-adh-027', 'star', 'Khaled Mestiri', 'KME-652', 'POL-2026-652', 'star-basique', 'Basique', 'INDIVIDUEL', 'REJETE', 0, 0, 'EMAIL'),
      this.adherent('star-adh-028', 'star', 'Marwa Bouazizi', 'MB-318', 'POL-2026-318', 'star-premium', 'Premium', 'GROUPE', 'VERIFIE', 7, 4120, 'IMPORT_CSV', 'star-contract-poulina', 'Société Poulina', 'POU-3184', 'Direction'),
      this.adherent('star-adh-029', 'star', 'Anis Ben Salem', 'ABS-563', 'POL-2026-563', 'star-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 3, 690, 'OMNICARE'),
      this.adherent('star-adh-030', 'star', 'Nour Gharbi', 'NG-885', 'POL-2026-885', 'star-premium', 'Premium', 'GROUPE', 'EN_ATTENTE', 0, 0, 'WEBSITE', 'star-contract-biat', 'BIAT', 'BIAT-8853', 'Conformité'),
    ];
  }

  private comarAdherents(): Adherent[] {
    return [
      this.adherent('comar-adh-001', 'comar', 'Ahmed Ben Ali', 'CB-789', 'COM-2026-001', 'comar-confort', 'Confort', 'GROUPE', 'VERIFIE', 2, 0, 'WEBSITE', 'comar-contract-steg', 'STEG', 'STEG-8421', 'Exploitation'),
      this.adherent('comar-adh-002', 'comar', 'Sami Ben Hmida', 'SBH-112', 'COM-2026-112', 'comar-confort', 'Confort', 'GROUPE', 'VERIFIE', 3, 640, 'OMNICARE', 'comar-contract-steg', 'STEG', 'STEG-1127', 'Distribution'),
      this.adherent('comar-adh-003', 'comar', 'Olfa Triki', 'OT-230', 'COM-2026-230', 'comar-basique', 'Basique', 'INDIVIDUEL', 'VERIFIE', 1, 90, 'EMAIL'),
      this.adherent('comar-adh-004', 'comar', 'Mourad Karray', 'MK-541', 'COM-2026-541', 'comar-confort', 'Confort', 'GROUPE', 'EN_ATTENTE', 0, 0, 'IMPORT_CSV', 'comar-contract-steg', 'STEG', 'STEG-5419', 'Technique'),
      this.adherent('comar-adh-005', 'comar', 'Emna Rekik', 'ER-666', 'COM-2026-666', 'comar-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 4, 1280, 'OMNICARE'),
      this.adherent('comar-adh-006', 'comar', 'Fedi Chouchane', 'FC-702', 'COM-2026-702', 'comar-basique', 'Basique', 'GROUPE', 'VERIFIE', 2, 210, 'WEBSITE', 'comar-contract-steg', 'STEG', 'STEG-7025', 'Maintenance'),
      this.adherent('comar-adh-007', 'comar', 'Rim Boukhris', 'RB-351', 'COM-2026-351', 'comar-confort', 'Confort', 'INDIVIDUEL', 'VERIFIE', 2, 480, 'MANUEL'),
      this.adherent('comar-adh-008', 'comar', 'Mohamed Laabidi', 'ML-901', 'COM-2026-901', 'comar-basique', 'Basique', 'GROUPE', 'VERIFIE', 1, 75, 'EMAIL', 'comar-contract-steg', 'STEG', 'STEG-9012', 'Sécurité'),
      this.adherent('comar-adh-009', 'comar', 'Hela Masmoudi', 'HM-412', 'COM-2026-412', 'comar-confort', 'Confort', 'GROUPE', 'VERIFIE', 5, 1740, 'OMNICARE', 'comar-contract-steg', 'STEG', 'STEG-4128', 'RH'),
      this.adherent('comar-adh-010', 'comar', 'Kais Zribi', 'KZ-819', 'COM-2026-819', 'comar-basique', 'Basique', 'INDIVIDUEL', 'REJETE', 0, 0, 'AUTRE'),
      this.adherent('comar-adh-011', 'comar', 'Saoussen Mami', 'SM-271', 'COM-2026-271', 'comar-confort', 'Confort', 'GROUPE', 'VERIFIE', 3, 930, 'IMPORT_CSV', 'comar-contract-steg', 'STEG', 'STEG-2716', 'Comptabilité'),
      this.adherent('comar-adh-012', 'comar', 'Jamel Dhaouadi', 'JD-724', 'COM-2026-724', 'comar-confort', 'Confort', 'INDIVIDUEL', 'EN_ATTENTE', 0, 0, 'WEBSITE'),
    ];
  }

  private starNetwork(): ProviderNetworkEntry[] {
    return [
      this.provider('star-net-001', 'star', 'Clinique Carthage', 'CLINIQUE', ['Chirurgie', 'Orthopédie', 'Cardiologie'], 'Tunis', 'Tunis', 'AGREE', true, 38, 124000),
      this.provider('star-net-002', 'star', 'Centre Kiné El Menzah', 'KINE', ['Rééducation', 'Kinésithérapie sportive'], 'Tunis', 'Tunis', 'AGREE', false, 22, 18400),
      this.provider('star-net-003', 'star', 'Cabinet Dr. Trabelsi', 'MEDECIN', ['Médecine générale'], 'Ariana', 'Ariana', 'AGREE', false, 18, 3200),
      this.provider('star-net-004', 'star', 'Laboratoire Pasteur Tunis', 'LABORATOIRE', ['Biologie médicale'], 'Tunis', 'Tunis', 'AGREE', true, 44, 28600),
      this.provider('star-net-005', 'star', 'Centre Imagerie du Lac', 'CLINIQUE', ['Radiologie', 'IRM', 'Scanner'], 'Tunis', 'Tunis', 'AGREE', true, 16, 21400),
      this.provider('star-net-006', 'star', 'Cabinet Dentaire Dr. Kallel', 'CABINET_DENTAIRE', ['Dentaire'], 'Sousse', 'Sousse', 'AGREE', false, 12, 6200),
      this.provider('star-net-007', 'star', 'Clinique les Jasmins', 'CLINIQUE', ['Maternité', 'Urgences'], 'Sfax', 'Sfax', 'EN_COURS_AGREMENT', false, 9, 18500),
      this.provider('star-net-008', 'star', 'Cabinet Dr. Ben Romdhane', 'MEDECIN', ['Cardiologie'], 'Monastir', 'Monastir', 'EN_COURS_AGREMENT', false, 7, 9600),
      this.provider('star-net-009', 'star', 'Clinique XYZ', 'CLINIQUE', ['Chirurgie générale'], 'Tunis', 'Tunis', 'HORS_RESEAU', false, 6, 58400),
      this.provider('star-net-010', 'star', 'Centre Optique Ennasr', 'AUTRE', ['Optique'], 'Ariana', 'Ariana', 'HORS_RESEAU', false, 11, 7200),
      this.provider('star-net-011', 'star', 'Cabinet Infirmier Saidi', 'INFIRMIER', ['Soins infirmiers'], 'Nabeul', 'Nabeul', 'AGREE', false, 14, 4100),
      this.provider('star-net-012', 'star', 'Polyclinique du Sahel', 'CLINIQUE', ['Hospitalisation', 'Urgences'], 'Sousse', 'Sousse', 'AGREE', true, 25, 89200),
    ];
  }

  private comarNetwork(): ProviderNetworkEntry[] {
    return [
      this.provider('comar-net-001', 'comar', 'Clinique El Manar', 'CLINIQUE', ['Chirurgie', 'Hospitalisation'], 'Tunis', 'Tunis', 'AGREE', true, 18, 67200),
      this.provider('comar-net-002', 'comar', 'Laboratoire Ibn Sina', 'LABORATOIRE', ['Biologie médicale'], 'Ben Arous', 'Ben Arous', 'AGREE', true, 26, 14800),
      this.provider('comar-net-003', 'comar', 'Cabinet Dr. Gharbi', 'MEDECIN', ['Médecine générale'], 'Sfax', 'Sfax', 'AGREE', false, 13, 2600),
      this.provider('comar-net-004', 'comar', 'Clinique XYZ', 'CLINIQUE', ['Chirurgie générale'], 'Tunis', 'Tunis', 'HORS_RESEAU', false, 4, 33600),
    ];
  }

  private starDemandes(): DemandeRemboursement[] {
    const duplicateFactureDate = this.dateOnly(this.daysAgo(4));

    return [
      this.demande({
        id: 'star-dem-001',
        companyId: 'star',
        patientName: 'Sonia Gharbi',
        patientMemberId: 'SG-456',
        planTierName: 'Premium',
        factureNumber: 'FAC-2026-0451',
        factureDate: this.dateOnly(this.daysAgo(18)),
        providerName: 'Cabinet Dr. Ben Romdhane',
        providerType: 'MEDECIN',
        providerInNetwork: true,
        actCategory: 'CONSULTATION',
        actDescription: 'Consultation spécialiste',
        totalAmount: 180,
        source: 'OMNICARE',
        status: 'APPROUVEE_AUTO',
        submittedAt: this.daysAgo(16),
        actDate: this.dateOnly(this.daysAgo(18)),
        approvedAmount: 108,
        riskScore: 'FAIBLE',
      }),
      this.demande({
        id: 'star-dem-002',
        companyId: 'star',
        patientName: 'Karim Mansour',
        patientMemberId: 'KM-321',
        planTierName: 'Basique',
        employerName: 'BIAT',
        contractId: 'star-contract-biat',
        factureNumber: 'FAC-2026-0488',
        factureDate: this.dateOnly(this.daysAgo(5)),
        providerName: 'Centre Kiné El Menzah',
        providerType: 'KINE',
        providerInNetwork: true,
        actCategory: 'KINESITHERAPIE',
        actDescription: 'Kiné (6 séances)',
        totalAmount: 420,
        source: 'OMNICARE',
        status: 'EN_EXAMEN',
        submittedAt: this.daysAgo(4),
        actDate: this.dateOnly(this.daysAgo(6)),
        flags: ['MONTANT_ELEVE'],
        riskScore: 'MOYEN',
      }),
      this.demande({
        id: 'star-dem-003',
        companyId: 'star',
        patientName: 'Ahmed Ben Ali',
        patientMemberId: 'AH-789',
        planTierName: 'Confort',
        employerName: 'Tunisie Telecom',
        contractId: 'star-contract-tt',
        factureNumber: 'FAC-CC-2026-0842',
        factureDate: duplicateFactureDate,
        providerName: 'Clinique Carthage',
        providerType: 'CLINIQUE',
        providerInNetwork: true,
        actCategory: 'CHIRURGIE',
        actDescription: 'Chirurgie genou',
        totalAmount: 10000,
        source: 'OMNICARE',
        status: 'EN_EXAMEN',
        submittedAt: this.daysAgo(3),
        actDate: this.dateOnly(this.daysAgo(5)),
        flags: ['AUTORISATION_MANQUANTE'],
        riskScore: 'ELEVE',
        crossCompanyDuplicateDetected: true,
      }),
      this.demande({
        id: 'star-dem-004',
        companyId: 'star',
        patientName: 'Imen Trabelsi',
        patientMemberId: 'IT-214',
        planTierName: 'Confort',
        factureNumber: 'FAC-2026-0520',
        factureDate: this.dateOnly(this.daysAgo(2)),
        providerName: 'Cabinet Infirmier Saidi',
        providerType: 'INFIRMIER',
        providerInNetwork: true,
        actCategory: 'SOINS_INFIRMIERS',
        actDescription: 'Soins infirmiers à domicile',
        totalAmount: 95,
        source: 'MANUEL',
        status: 'DOCUMENTS_INCOMPLETS',
        submittedAt: this.daysAgo(2),
        actDate: this.dateOnly(this.daysAgo(3)),
        flags: ['DOCUMENTS_MANQUANTS'],
        riskScore: 'FAIBLE',
        documents: this.claimDocuments('star-dem-004', ['FACTURE'], ['BULLETIN_DE_SOINS']),
      }),
      this.demande({
        id: 'star-dem-005',
        companyId: 'star',
        patientName: 'Hichem Bouzid',
        patientMemberId: 'HB-118',
        planTierName: 'Basique',
        factureNumber: 'FAC-2026-0390',
        factureDate: this.dateOnly(this.daysAgo(12)),
        providerName: 'Cabinet Dr. Trabelsi',
        providerType: 'MEDECIN',
        providerInNetwork: true,
        actCategory: 'CONSULTATION',
        actDescription: 'Visite médecin domicile',
        totalAmount: 45,
        source: 'OMNICARE',
        status: 'APPROUVEE',
        submittedAt: this.daysAgo(10),
        actDate: this.dateOnly(this.daysAgo(12)),
        approvedAmount: 14,
        riskScore: 'FAIBLE',
      }),
      this.demande({
        id: 'star-dem-006',
        companyId: 'star',
        patientName: 'Leila Brahmi',
        patientMemberId: 'LB-442',
        planTierName: 'Confort',
        factureNumber: 'FAC-2026-0417',
        factureDate: this.dateOnly(this.daysAgo(11)),
        providerName: 'Cabinet Dentaire Dr. Kallel',
        providerType: 'AUTRE',
        providerInNetwork: true,
        actCategory: 'DENTAIRE',
        actDescription: 'Soins dentaires conservateurs',
        totalAmount: 320,
        source: 'WEBSITE',
        status: 'REFUSEE',
        submittedAt: this.daysAgo(9),
        actDate: this.dateOnly(this.daysAgo(11)),
        rejectionReason: 'PLAFOND_ATTEINT',
        rejectionNotes: 'Plafond annuel dentaire consommé pour 2026.',
        riskScore: 'FAIBLE',
      }),
      this.demande({
        id: 'star-dem-007',
        companyId: 'star',
        patientName: 'Nabil Karoui',
        patientMemberId: 'NK-220',
        planTierName: 'Basique',
        employerName: 'BIAT',
        contractId: 'star-contract-biat',
        factureNumber: 'FAC-2026-0444',
        factureDate: this.dateOnly(this.daysAgo(8)),
        providerName: 'Centre Imagerie du Lac',
        providerType: 'CLINIQUE',
        providerInNetwork: true,
        actCategory: 'RADIOLOGIE',
        actDescription: 'Radiologie',
        totalAmount: 180,
        source: 'EMAIL',
        status: 'APPROUVEE',
        submittedAt: this.daysAgo(7),
        actDate: this.dateOnly(this.daysAgo(8)),
        approvedAmount: 54,
        riskScore: 'FAIBLE',
      }),
      this.demande({
        id: 'star-dem-008',
        companyId: 'star',
        patientName: 'Fatma Mansour',
        patientMemberId: 'FM-908',
        planTierName: 'Premium',
        employerName: 'Société Poulina',
        contractId: 'star-contract-poulina',
        factureNumber: 'FAC-2026-0505',
        factureDate: this.dateOnly(this.daysAgo(6)),
        providerName: 'Polyclinique du Sahel',
        providerType: 'CLINIQUE',
        providerInNetwork: true,
        actCategory: 'HOSPITALISATION',
        actDescription: 'Hospitalisation',
        totalAmount: 8500,
        source: 'IMPORT_CSV',
        status: 'APPROUVEE_PARTIELLEMENT',
        submittedAt: this.daysAgo(5),
        actDate: this.dateOnly(this.daysAgo(6)),
        approvedAmount: 6800,
        flags: ['SEUIL_REASSURANCE'],
        riskScore: 'MOYEN',
      }),
    ];
  }

  private comarDemandes(): DemandeRemboursement[] {
    const duplicateFactureDate = this.dateOnly(this.daysAgo(4));

    return [
      this.demande({
        id: 'comar-dem-001',
        companyId: 'comar',
        patientName: 'Ahmed Ben Ali',
        patientMemberId: 'CB-789',
        planTierName: 'Confort',
        employerName: 'STEG',
        contractId: 'comar-contract-steg',
        factureNumber: 'FAC-CC-2026-0842',
        factureDate: duplicateFactureDate,
        providerName: 'Clinique XYZ',
        providerType: 'CLINIQUE',
        providerInNetwork: false,
        actCategory: 'CHIRURGIE',
        actDescription: 'Chirurgie genou',
        totalAmount: 10000,
        source: 'WEBSITE',
        status: 'SOUMISE',
        submittedAt: this.hoursAgo(54),
        actDate: this.dateOnly(this.daysAgo(5)),
        flags: ['DOUBLON_SUSPECT', 'PRESTATAIRE_HORS_RESEAU'],
        riskScore: 'ELEVE',
        crossCompanyDuplicateDetected: true,
      }),
      this.demande({
        id: 'comar-dem-002',
        companyId: 'comar',
        patientName: 'Sami Ben Hmida',
        patientMemberId: 'SBH-112',
        planTierName: 'Confort',
        employerName: 'STEG',
        contractId: 'comar-contract-steg',
        factureNumber: 'COM-FAC-2026-0198',
        factureDate: this.dateOnly(this.daysAgo(7)),
        providerName: 'Laboratoire Ibn Sina',
        providerType: 'AUTRE',
        providerInNetwork: true,
        actCategory: 'BIOLOGIE',
        actDescription: 'Bilan biologique complet',
        totalAmount: 145,
        source: 'OMNICARE',
        status: 'APPROUVEE',
        submittedAt: this.daysAgo(6),
        actDate: this.dateOnly(this.daysAgo(7)),
        approvedAmount: 58,
        riskScore: 'FAIBLE',
      }),
      this.demande({
        id: 'comar-dem-003',
        companyId: 'comar',
        patientName: 'Olfa Triki',
        patientMemberId: 'OT-230',
        planTierName: 'Basique',
        factureNumber: 'COM-FAC-2026-0204',
        factureDate: this.dateOnly(this.daysAgo(3)),
        providerName: 'Cabinet Dr. Gharbi',
        providerType: 'MEDECIN',
        providerInNetwork: true,
        actCategory: 'CONSULTATION',
        actDescription: 'Consultation généraliste',
        totalAmount: 60,
        source: 'EMAIL',
        status: 'DOCUMENTS_INCOMPLETS',
        submittedAt: this.daysAgo(2),
        actDate: this.dateOnly(this.daysAgo(3)),
        flags: ['DOCUMENTS_MANQUANTS'],
        riskScore: 'FAIBLE',
        documents: this.claimDocuments('comar-dem-003', ['FACTURE'], ['BULLETIN_DE_SOINS']),
      }),
      this.demande({
        id: 'comar-dem-004',
        companyId: 'comar',
        patientName: 'Rim Boukhris',
        patientMemberId: 'RB-351',
        planTierName: 'Confort',
        factureNumber: 'COM-FAC-2026-0210',
        factureDate: this.dateOnly(this.daysAgo(10)),
        providerName: 'Centre Optique Ennasr',
        providerType: 'AUTRE',
        providerInNetwork: false,
        actCategory: 'OPTIQUE',
        actDescription: 'Verres correcteurs',
        totalAmount: 280,
        source: 'AUTRE',
        status: 'REFUSEE',
        submittedAt: this.daysAgo(9),
        actDate: this.dateOnly(this.daysAgo(10)),
        rejectionReason: 'PRESTATAIRE_NON_AGREE',
        rejectionNotes: 'Prestataire non agréé pour le plan Confort COMAR.',
        flags: ['PRESTATAIRE_HORS_RESEAU'],
        riskScore: 'MOYEN',
      }),
    ];
  }

  private starAutorisations(): AutorisationPrealable[] {
    return [
      this.autorisation({
        id: 'star-auth-001',
        companyId: 'star',
        patientName: 'Fatma Karoui',
        patientMemberId: 'FK-541',
        planTierName: 'Premium',
        actType: 'Chirurgie abdominale',
        actCategory: 'CHIRURGIE',
        providerName: 'Clinique Carthage',
        providerInNetwork: true,
        status: 'EN_ATTENTE',
        submittedAt: this.daysAgo(12),
        expiresAt: this.daysFromNow(3),
      }),
      this.autorisation({
        id: 'star-auth-002',
        companyId: 'star',
        patientName: 'Nabil Ferchichi',
        patientMemberId: 'NF-332',
        planTierName: 'Confort',
        employerName: 'Tunisie Telecom',
        actType: 'Hospitalisation orthopédie',
        actCategory: 'HOSPITALISATION',
        providerName: 'Polyclinique du Sahel',
        providerInNetwork: true,
        status: 'EN_EXAMEN',
        submittedAt: this.daysAgo(6),
        expiresAt: this.daysFromNow(9),
      }),
      this.autorisation({
        id: 'star-auth-003',
        companyId: 'star',
        patientName: 'Salma Bouzayane',
        patientMemberId: 'SB-772',
        planTierName: 'Premium',
        actType: 'Chirurgie cardiaque',
        actCategory: 'CHIRURGIE',
        providerName: 'Clinique Carthage',
        providerInNetwork: true,
        status: 'APPROUVEE_AUTO',
        submittedAt: this.daysAgo(18),
        expiresAt: this.daysAgo(3),
        respondedAt: this.daysAgo(3),
        authorizationNumber: 'AUTH-AUTO-849201',
        conditions: 'Autorisation générée automatiquement après expiration du délai légal.',
      }),
      this.autorisation({
        id: 'star-auth-004',
        companyId: 'star',
        patientName: 'Mehdi Trabelsi',
        patientMemberId: 'MT-619',
        planTierName: 'Confort',
        actType: 'IRM cérébrale',
        actCategory: 'RADIOLOGIE',
        providerName: 'Centre Imagerie du Lac',
        providerInNetwork: true,
        status: 'APPROUVEE',
        submittedAt: this.daysAgo(4),
        expiresAt: this.daysFromNow(11),
        respondedAt: this.daysAgo(1),
        respondedBy: 'Ahmed Direche',
        authorizationNumber: 'AUTH-STAR-2026-00142',
        conditions: 'Valable pour une seule réalisation sous 30 jours.',
      }),
    ];
  }

  private comarAutorisations(): AutorisationPrealable[] {
    return [
      this.autorisation({
        id: 'comar-auth-001',
        companyId: 'comar',
        patientName: 'Emna Rekik',
        patientMemberId: 'ER-666',
        planTierName: 'Confort',
        actType: 'Hospitalisation maternité',
        actCategory: 'MATERNITE',
        providerName: 'Clinique El Manar',
        providerInNetwork: true,
        status: 'EN_ATTENTE',
        submittedAt: this.daysAgo(8),
        expiresAt: this.daysFromNow(7),
      }),
      this.autorisation({
        id: 'comar-auth-002',
        companyId: 'comar',
        patientName: 'Hela Masmoudi',
        patientMemberId: 'HM-412',
        planTierName: 'Confort',
        employerName: 'STEG',
        actType: 'Chirurgie ORL',
        actCategory: 'CHIRURGIE',
        providerName: 'Clinique El Manar',
        providerInNetwork: true,
        status: 'APPROUVEE',
        submittedAt: this.daysAgo(10),
        expiresAt: this.daysFromNow(5),
        respondedAt: this.daysAgo(6),
        respondedBy: 'Sami Bouzid',
        authorizationNumber: 'AUTH-COMAR-2026-00077',
      }),
    ];
  }

  private company(
    id: string,
    name: string,
    code: string,
    status: InsuranceCompany['status'],
    participatesInCrossFraudDetection: boolean,
    participatesInMarketAnalytics: boolean,
  ): InsuranceCompany {
    return {
      id,
      name,
      code,
      logoUrl: `/assets/logos/${id}.svg`,
      cgaRegistrationNumber: `CGA-${code}-2026`,
      inpdpDeclarationNumber: `INPDP-${code}-2026`,
      contactEmail: `contact@${id.replaceAll('-', '')}.tn`,
      contactPhone: '+216 71 000 000',
      address: 'Avenue Mohamed V, Tunis',
      status,
      onboardedAt: status === 'ACTIVE' ? this.daysAgo(120) : this.daysAgo(12),
      onboardingCompleted: status === 'ACTIVE',
      participatesInCrossFraudDetection,
      participatesInMarketAnalytics,
    };
  }

  private planTier(
    id: string,
    companyId: string,
    name: string,
    description: string,
    monthlyPremium: number,
    averageCoverage: 25 | 40 | 60,
  ): PlanTier {
    const isBasique = averageCoverage === 25;
    const isConfort = averageCoverage === 40;

    return {
      id,
      companyId,
      name,
      description,
      monthlyPremium,
      coverageRules: [
        this.coverage('CONSULTATION', isBasique ? 30 : isConfort ? 40 : 65, 120, undefined, 'Consultations généralistes et spécialistes'),
        this.coverage('CHIRURGIE', isBasique ? 25 : isConfort ? 50 : 70, isBasique ? 5000 : isConfort ? 10000 : 18000),
        this.coverage('KINESITHERAPIE', isBasique ? 25 : isConfort ? 40 : 60, 600, isBasique ? 900 : isConfort ? 1500 : 2600),
        this.coverage('SOINS_INFIRMIERS', isBasique ? 25 : isConfort ? 40 : 60, 300, 1200),
        this.coverage('RADIOLOGIE', isBasique ? 30 : isConfort ? 45 : 65, 900, 2600),
        this.coverage('BIOLOGIE', isBasique ? 35 : isConfort ? 45 : 65, 450, 1800),
        this.coverage('HOSPITALISATION', isBasique ? 30 : isConfort ? 50 : 75, isBasique ? 6000 : isConfort ? 12000 : 22000),
        this.coverage('DENTAIRE', isBasique ? 15 : isConfort ? 30 : 50, 250, isBasique ? 250 : isConfort ? 600 : 1200),
        this.coverage('OPTIQUE', isBasique ? 15 : isConfort ? 30 : 50, 220, isBasique ? 220 : isConfort ? 500 : 1000),
        this.coverage('PSYCHIATRIE', isBasique ? 20 : isConfort ? 35 : 55, 180, 900),
        this.coverage('MATERNITE', isBasique ? 25 : isConfort ? 45 : 70, isBasique ? 2500 : isConfort ? 6000 : 11000),
        this.coverage('URGENCES', isBasique ? 35 : isConfort ? 50 : 75, 900, 3000),
        this.coverage('AUTRE', isBasique ? 20 : isConfort ? 35 : 50, 300, 1000),
      ],
      autoApproveThreshold: isBasique ? 120 : isConfort ? 250 : 450,
      reinsuranceThreshold: isBasique ? 5000 : isConfort ? 8000 : 12000,
      claimFilingDeadlineDays: isBasique ? 30 : 45,
      slaTargetDays: isBasique ? 12 : isConfort ? 10 : 7,
      requiresPriorAuth: isBasique
        ? ['CHIRURGIE', 'HOSPITALISATION']
        : ['CHIRURGIE', 'HOSPITALISATION', 'MATERNITE'],
    };
  }

  private coverage(
    actCategory: ActCategory,
    coveragePercent: number,
    maxAmountPerClaim?: number,
    maxAmountPerYear?: number,
    notes?: string,
  ) {
    return {
      actCategory,
      coveragePercent,
      maxAmountPerClaim,
      maxAmountPerYear,
      notes,
    };
  }

  private adherent(
    id: string,
    companyId: string,
    patientName: string,
    membershipId: string,
    policyNumber: string,
    planTierId: string,
    planTierName: string,
    enrollmentType: Adherent['enrollmentType'],
    verificationStatus: Adherent['verificationStatus'],
    totalClaimsThisYear: number,
    totalReimbursedThisYear: number,
    source: ClaimSource,
    contractId?: string,
    employerName?: string,
    employeeMatricule?: string,
    departmentOrGrade?: string,
  ): Adherent {
    return {
      id,
      companyId,
      patientName,
      membershipId,
      policyNumber,
      planTierId,
      planTierName,
      enrollmentType,
      employer:
        contractId && employerName && employeeMatricule
          ? {
              contractId,
              employerName,
              employeeMatricule,
              departmentOrGrade,
            }
          : undefined,
      verificationStatus,
      enrolledAt: this.daysAgo(90),
      verifiedAt: verificationStatus === 'VERIFIE' ? this.daysAgo(84) : undefined,
      totalClaimsThisYear,
      totalReimbursedThisYear,
      source,
    };
  }

  private provider(
    id: string,
    companyId: string,
    providerName: string,
    providerType: ProviderNetworkEntry['providerType'],
    specialties: string[],
    city: string,
    region: string,
    networkStatus: ProviderNetworkEntry['networkStatus'],
    tiersPayantEnabled: boolean,
    claimsThisYear: number,
    totalReimbursedThisYear: number,
  ): ProviderNetworkEntry {
    return {
      id,
      companyId,
      providerName,
      providerType,
      specialties,
      city,
      region,
      networkStatus,
      tiersPayantEnabled,
      agreedSince: networkStatus === 'AGREE' ? this.dateOnly(this.daysAgo(780)) : undefined,
      claimsThisYear,
      totalReimbursedThisYear,
    };
  }

  private demande(input: {
    id: string;
    companyId: string;
    patientName: string;
    patientMemberId: string;
    planTierName: string;
    employerName?: string;
    contractId?: string;
    factureNumber: string;
    factureDate: string;
    providerName: string;
    providerType: DemandeRemboursement['providerType'];
    providerInNetwork: boolean;
    actCategory: ActCategory;
    actDescription: string;
    totalAmount: number;
    source: ClaimSource;
    status: DemandeRemboursement['status'];
    submittedAt: string;
    actDate: string;
    approvedAmount?: number;
    rejectionReason?: DemandeRemboursement['rejectionReason'];
    rejectionNotes?: string;
    flags?: DemandeRemboursement['flags'];
    riskScore: DemandeRemboursement['riskScore'];
    priorAuthorizationRef?: string;
    documents?: RequestDocument[];
    crossCompanyDuplicateDetected?: boolean;
    respondedAt?: string;
    respondedBy?: string;
    lastUpdatedAt?: string;
    comarBulletin?: DemandeRemboursement['comarBulletin'];
  }): DemandeRemboursement {
    const respondedAt =
      input.respondedAt ??
      (this.isFinalDemandeStatus(input.status) ? this.daysAgo(1) : undefined);
    const respondedBy =
      input.respondedBy ??
      (this.isFinalDemandeStatus(input.status)
        ? input.companyId === 'star'
          ? 'Ahmed Direche'
          : 'Sami Bouzid'
        : undefined);

    return {
      id: input.id,
      companyId: input.companyId,
      patientName: input.patientName,
      patientMemberId: input.patientMemberId,
      planTierName: input.planTierName,
      employerName: input.employerName,
      contractId: input.contractId,
      factureNumber: input.factureNumber,
      factureDate: input.factureDate,
      providerName: input.providerName,
      providerType: input.providerType,
      providerInNetwork: input.providerInNetwork,
      actCategory: input.actCategory,
      actDescription: input.actDescription,
      totalAmount: input.totalAmount,
      priorAuthorizationRef: input.priorAuthorizationRef,
      source: input.source,
      documents: input.documents ?? this.claimDocuments(input.id, ['FACTURE', 'BULLETIN_DE_SOINS']),
      status: input.status,
      submittedAt: input.submittedAt,
      actDate: input.actDate,
      lastUpdatedAt: input.lastUpdatedAt ?? this.hoursAgo(8),
      respondedAt,
      respondedBy,
      approvedAmount: input.approvedAmount,
      rejectionReason: input.rejectionReason,
      rejectionNotes: input.rejectionNotes,
      flags: input.flags ?? [],
      riskScore: input.riskScore,
      crossCompanyDuplicateDetected: input.crossCompanyDuplicateDetected,
      comarBulletin:
        input.comarBulletin ??
        this.comarBulletinData({
          ...input,
          respondedAt,
          respondedBy,
        }),
    };
  }

  private comarBulletinData(input: {
    id: string;
    companyId: string;
    patientName: string;
    patientMemberId: string;
    employerName?: string;
    contractId?: string;
    providerName: string;
    actDescription: string;
    totalAmount: number;
    status: DemandeRemboursement['status'];
    actDate: string;
    approvedAmount?: number;
    respondedAt?: string;
    respondedBy?: string;
  }): DemandeRemboursement['comarBulletin'] {
    const companyLabel = input.companyId === 'comar' ? 'COMAR Assurances' : 'Société El Menzah Services';
    const patientAddressByMember: Record<string, string> = {
      'AH-789': '12 rue Ibn Khaldoun, Mutuelleville, Tunis',
      'CB-789': 'Avenue Mohamed V, Tunis',
      'FM-908': 'Rue du Lac Biwa, Les Berges du Lac, Tunis',
      'KM-321': '12 Avenue Habib Bourguiba, Tunis',
      'SBH-112': 'Avenue Hedi Nouira, Sfax',
      'SG-456': 'Cité Ennasr 2, Ariana',
    };
    const amountLabel = `${Math.round(input.totalAmount)} DT`;
    const approvedAmountLabel =
      input.approvedAmount === undefined ? amountLabel : `${Math.round(input.approvedAmount)} DT`;

    return {
      identity: {
        identifiantUnique: input.id,
        societyName: input.employerName ?? companyLabel,
        adherentFullName: input.patientName,
        address:
          patientAddressByMember[input.patientMemberId] ?? '12 Avenue Habib Bourguiba, Tunis',
        contractNumber:
          input.contractId ?? `${input.companyId.toUpperCase()}-IND-${input.patientMemberId}`,
        matricule: input.patientMemberId,
        patientFirstName: input.patientName.split(' ')[0] ?? input.patientName,
      },
      provider: {
        specialistNameAndAddress: `${input.providerName}, Tunis`,
        establishmentStamp: input.providerName,
        doctorSignatureLabel: input.providerName,
        providerFiscalNumber: `MF-${input.companyId.toUpperCase()}-${input.patientMemberId.replace(/[^A-Z0-9]/g, '')}`,
      },
      medicalActs: [
        {
          actDate: input.actDate,
          actDesignation: input.actDescription,
          actCoefficient: input.actDescription.toLowerCase().includes('kiné') ? 'K6' : '—',
          honorairesAmount: amountLabel,
          ordonnanceDelivered: 'Oui',
          invoiceAmount: amountLabel,
        },
      ],
      pharmacy: {
        pharmacyOrSupplierStamp: 'Pharmacie Centrale El Menzah',
      },
      declaration: {
        declarationDate: input.actDate,
        adherentVisa: input.patientName,
        employerVisa: input.employerName ?? companyLabel,
      },
      assuranceDecision: this.isFinalDemandeStatus(input.status)
        ? {
            label: this.comarBulletinDecision(input.status),
            approvedAmount: approvedAmountLabel,
            reviewerName: input.respondedBy ?? 'Admin assurance',
            reviewedDate: input.respondedAt ?? input.actDate,
          }
        : undefined,
    };
  }

  private comarBulletinDecision(status: DemandeRemboursement['status']): string {
    switch (status) {
      case 'APPROUVEE':
      case 'APPROUVEE_AUTO':
        return 'Accord assurance';
      case 'APPROUVEE_PARTIELLEMENT':
        return 'Accord partiel assurance';
      case 'REFUSEE':
        return 'Refus assurance';
      case 'DOCUMENTS_INCOMPLETS':
        return 'Complément demandé';
      case 'EN_EXAMEN':
        return 'En cours d’examen';
      default:
        return 'Pré-rempli patient';
    }
  }

  private autorisation(input: {
    id: string;
    companyId: string;
    patientName: string;
    patientMemberId: string;
    planTierName: string;
    employerName?: string;
    actType: string;
    actCategory: ActCategory;
    providerName: string;
    providerInNetwork: boolean;
    status: AutorisationPrealable['status'];
    submittedAt: string;
    expiresAt: string;
    respondedAt?: string;
    respondedBy?: string;
    authorizationNumber?: string;
    conditions?: string;
  }): AutorisationPrealable {
    return {
      id: input.id,
      companyId: input.companyId,
      patientName: input.patientName,
      patientMemberId: input.patientMemberId,
      planTierName: input.planTierName,
      employerName: input.employerName,
      actType: input.actType,
      actCategory: input.actCategory,
      plannedDate: this.dateOnly(this.daysFromNow(20)),
      providerName: input.providerName,
      providerInNetwork: input.providerInNetwork,
      clinicalJustification:
        'Dossier médical transmis pour avis administratif et vérification des règles de couverture.',
      source: 'OMNICARE',
      documents: this.authorizationDocuments(input.id),
      status: input.status,
      submittedAt: input.submittedAt,
      expiresAt: input.expiresAt,
      respondedAt: input.respondedAt,
      respondedBy: input.respondedBy,
      authorizationNumber: input.authorizationNumber,
      conditions: input.conditions,
    };
  }

  private claimDocuments(
    prefix: string,
    received: DocumentType[],
    missing: DocumentType[] = [],
  ): RequestDocument[] {
    return [
      ...received.map((type, index) => this.document(`${prefix}-doc-${index + 1}`, type, 'RECU')),
      ...missing.map((type, index) =>
        this.document(`${prefix}-missing-${index + 1}`, type, 'MANQUANT'),
      ),
    ];
  }

  private authorizationDocuments(prefix: string): RequestDocument[] {
    return [
      this.document(`${prefix}-doc-1`, 'ORDONNANCE', 'RECU'),
      this.document(`${prefix}-doc-2`, 'CERTIFICAT_MEDICAL', 'RECU'),
    ];
  }

  private document(
    id: string,
    type: DocumentType,
    status: RequestDocument['status'],
  ): RequestDocument {
    return {
      id,
      type,
      label: this.documentLabel(type),
      fileUrl: `mock-pdf://${id}`,
      uploadedAt: this.daysAgo(2),
      uploadedBy: 'PATIENT',
      status,
    };
  }

  private documentLabel(type: DocumentType): string {
    switch (type) {
      case 'FACTURE':
        return 'Facture';
      case 'BULLETIN_DE_SOINS':
        return 'Bulletin de soins';
      case 'ORDONNANCE':
        return 'Ordonnance';
      case 'CERTIFICAT_MEDICAL':
        return 'Certificat médical';
      case 'COMPTE_RENDU_OPERATOIRE':
        return 'Compte rendu opératoire';
      default:
        return 'Autres documents';
    }
  }

  private readReceipts(companyIds: string[], sentDaysAgo: number) {
    const namesByCompany: Record<string, string> = {
      star: 'Ahmed Direche',
      comar: 'Sami Bouzid',
      gat: 'Leila Kammoun',
      maghrebia: 'Nadia Karray',
      carte: 'Karim Saidi',
      bh: 'Sonia Mestiri',
      ami: 'Hatem Triki',
      'maghrebia-vie': 'Rim Baccouche',
    };

    return companyIds.map((companyId, index) => ({
      companyId,
      readBy: namesByCompany[companyId] ?? 'Admin compagnie',
      readAt: this.daysAgo(Math.max(sentDaysAgo - 1, 0), index + 1),
    }));
  }

  private actCategoryMetadata(): ActCategoryMetadata[] {
    const labels: Record<ActCategory, string> = {
      CONSULTATION: 'Consultation',
      CHIRURGIE: 'Chirurgie',
      KINESITHERAPIE: 'Kinésithérapie',
      SOINS_INFIRMIERS: 'Soins infirmiers',
      RADIOLOGIE: 'Radiologie',
      BIOLOGIE: 'Biologie',
      HOSPITALISATION: 'Hospitalisation',
      DENTAIRE: 'Dentaire',
      OPTIQUE: 'Optique',
      PSYCHIATRIE: 'Psychiatrie',
      MATERNITE: 'Maternité',
      URGENCES: 'Urgences',
      AUTRE: 'Autre',
    };

    return Object.entries(labels).map(([id, label]) => ({
      id: id as ActCategory,
      label,
      active: true,
    }));
  }

  private isFinalDemandeStatus(status: DemandeRemboursement['status']): boolean {
    return (
      status === 'APPROUVEE' ||
      status === 'APPROUVEE_PARTIELLEMENT' ||
      status === 'APPROUVEE_AUTO' ||
      status === 'REFUSEE'
    );
  }

  private hash(value: string): string {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return `hash#${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }

  private clearDemoKeys(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const keysToRemove: string[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (key?.startsWith('omnicare_ftusa_') || key?.startsWith('omnicare_ins_')) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  private daysAgo(days: number, hoursOffset = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString();
  }

  private hoursAgo(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }

  private daysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  private dateOnly(isoDate: string): string {
    return isoDate.slice(0, 10);
  }
}
