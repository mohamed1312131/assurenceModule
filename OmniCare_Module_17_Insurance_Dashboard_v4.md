# OmniCare — Module 17 — Tableau de Bord Assurance FTUSA
**Version:** Demo v4 — Final (post-CEO roast)
**Date:** 2026-05-25
**Status:** SPEC LOCKED — READY FOR DEMO IMPLEMENTATION
**Architect:** Claude
**CTO:** Mechergui

---

## 0. What This Module Is

A standalone web platform sold to **FTUSA (Fédération Tunisienne des Sociétés d'Assurances)** for management of health insurance claims and authorization requests.

### 0.1 Ownership and Independence

Once delivered, the system is **owned and operated by FTUSA**. It runs on FTUSA's infrastructure. FTUSA administers it. OmniCare is one of multiple input channels feeding claims into the system — not a controller, not an operator, not a viewer of the data.

```
OmniCare patient app  ─┐
Insurance company web  ─┤
Email (PDFs)          ─┼──► FTUSA-OWNED INSURANCE PLATFORM
Manual entry          ─┤    ─ FTUSA_ADMIN administers
CSV / Excel import    ─┘    ─ ASSURANCE_ADMIN per company manages claims
```

The platform must function fully without OmniCare. OmniCare is a channel — not a dependency.

### 0.2 Two Request Types Handled

1. **Autorisation Préalable** — pre-approval request before an expensive medical act (surgery, hospitalization). Includes ordonnance / certificat médical PDFs.
2. **Demande de Remboursement** — post-care reimbursement request with facture PDF + bulletin de soins PDF + other documents.

### 0.3 Demo Constraints

- React 18 + TypeScript + Tailwind CSS v4 + React Router
- All data in browser localStorage
- No backend
- All UI 100% French
- PDFs are mock HTML renderings shown in modals
- Existing OmniCare design system: primary #1FBF9A, secondary #0F6F73, accent #6BE3B2, BG #F4F5F7

### 0.4 What This Demo Proves to FTUSA

This is a static demo built to demonstrate professional thinking before any commitment. FTUSA reviews → requests changes → iterates → approves → real development begins.

---

## 1. Roles

Only two roles in the entire module.

| Role | Scope | Created By |
|---|---|---|
| `FTUSA_ADMIN` | Federation administrator — manages the whole platform | System (root) |
| `ASSURANCE_ADMIN` | One administrator per insurance company tenant | FTUSA_ADMIN |

**Demo accounts:**
- FTUSA_ADMIN (single account, root)
- ASSURANCE_ADMIN for STAR Assurances
- ASSURANCE_ADMIN for COMAR Assurances (optional — to show multi-tenancy)

No agents. No médecin conseil. No CNAM. No patient login in this module.

---

## 2. Dashboard Navigation — Two Sidebars

### 2.1 FTUSA_ADMIN sidebar

```
[FTUSA Logo]
Tableau de bord marché
Compagnies                  ← create + manage tenants
Analytique marché
Fraude & Risque             ← cross-company view
Export d'activité           ← neutral, NOT "Rapport CGA"
Communications              ← broadcast to all ASSURANCE_ADMINs
Paramètres plateforme
─────────────────────────
[Admin User]
[Déconnexion]
```

### 2.2 ASSURANCE_ADMIN sidebar (per company)

```
[Company Logo — STAR]
Tableau de bord
Demandes                    ← multi-source claim queue
Autorisations préalables
Adhérents                   ← members
Entreprises                 ← group contracts (real feature)
Réseau Agréé                ← provider network (credibility)
Fraude & Risque
Configuration
Analytique
─────────────────────────
[Admin User]
[Déconnexion]
```

---

## 3. Data Models

### 3.1 Insurance Company (Tenant)

```typescript
interface InsuranceCompany {
  id: string;
  name: string;                          // "STAR Assurances"
  code: string;                          // "STAR" — used in auth numbers
  logoUrl: string;
  cgaRegistrationNumber: string;
  inpdpDeclarationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  
  status: 'EN_ATTENTE' | 'ACTIVE' | 'SUSPENDUE';
  onboardedAt: string;
  onboardingCompleted: boolean;
  
  // Cross-company sharing opt-in
  participatesInCrossFraudDetection: boolean;
  participatesInMarketAnalytics: boolean;
}
```

### 3.2 Admin Accounts

```typescript
interface AdminAccount {
  id: string;
  role: 'FTUSA_ADMIN' | 'ASSURANCE_ADMIN';
  companyId?: string;                    // only for ASSURANCE_ADMIN
  name: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt?: string;
}
```

### 3.3 Plan Tier

```typescript
interface PlanTier {
  id: string;
  companyId: string;
  name: string;                          // "Basique" | "Confort" | "Premium" | custom
  description: string;
  monthlyPremium: number;                // TND informational
  
  coverageRules: CoverageRule[];
  
  autoApproveThreshold: number;          // TND
  reinsuranceThreshold: number;          // TND
  claimFilingDeadlineDays: number;       // days from act date
  slaTargetDays: number;
  
  requiresPriorAuth: ActCategory[];      // categories needing autorisation préalable
}

interface CoverageRule {
  actCategory: ActCategory;
  coveragePercent: number;               // 0–100
  maxAmountPerClaim?: number;            // TND
  maxAmountPerYear?: number;             // TND
  notes?: string;
}

type ActCategory =
  | 'CONSULTATION'
  | 'CHIRURGIE'
  | 'KINESITHERAPIE'
  | 'SOINS_INFIRMIERS'
  | 'RADIOLOGIE'
  | 'BIOLOGIE'
  | 'HOSPITALISATION'
  | 'DENTAIRE'
  | 'OPTIQUE'
  | 'PSYCHIATRIE'
  | 'MATERNITE'
  | 'URGENCES'
  | 'AUTRE';
```

### 3.4 Adhérent (Member)

```typescript
interface Adherent {
  id: string;
  companyId: string;
  
  // Personal info
  patientName: string;
  membershipId: string;                  // e.g. "AH-789"
  policyNumber: string;
  
  // Plan
  planTierId: string;
  planTierName: string;
  
  // Enrollment context
  enrollmentType: 'INDIVIDUEL' | 'GROUPE';
  employer?: EmployerReference;
  
  // Verification
  verificationStatus: 'EN_ATTENTE' | 'VERIFIE' | 'REJETE';
  enrolledAt: string;
  verifiedAt?: string;
  
  // Stats
  totalClaimsThisYear: number;
  totalReimbursedThisYear: number;       // TND
  
  // Source
  source: ClaimSource;                   // how this member was enrolled
}

interface EmployerReference {
  contractId: string;                    // CorporateContract.id
  employerName: string;                  // "Tunisie Telecom"
  employeeMatricule: string;             // "TT-4521"
  departmentOrGrade?: string;            // optional
}

type ClaimSource =
  | 'OMNICARE'                           // came from OmniCare patient app
  | 'MANUEL'                             // ASSURANCE_ADMIN entered manually
  | 'IMPORT_CSV'                         // bulk import
  | 'WEBSITE'                            // company's own website
  | 'EMAIL'                              // PDF received by email
  | 'AUTRE';
```

### 3.5 Corporate Contract (Group Insurance)

```typescript
interface CorporateContract {
  id: string;
  companyId: string;                     // insurer
  
  // Employer
  employerName: string;                  // "Tunisie Telecom"
  employerSector: string;                // "Télécommunications"
  hrContactName: string;
  hrContactEmail: string;
  
  // Contract dates
  contractStartDate: string;
  contractEndDate: string;
  renewalNoticeDate: string;             // 60 days before end
  
  // Capacity
  totalEmployees: number;
  enrolledEmployees: number;
  
  // Financials
  annualPremium: number;                 // TND total
  
  // Plans available under this contract
  availablePlanTiers: string[];          // PlanTier IDs
  
  // Computed stats (refresh on dashboard load)
  claimsThisYear: number;
  reimbursedThisYear: number;            // TND
  claimsRatio: number;                   // reimbursed / premium
  
  status: 'ACTIF' | 'EXPIRATION_PROCHE' | 'EXPIRE' | 'SUSPENDU';
}
```

### 3.6 Autorisation Préalable

```typescript
interface AutorisationPrealable {
  id: string;
  companyId: string;
  
  // Patient
  patientName: string;
  patientMemberId: string;
  planTierName: string;
  employerName?: string;                 // if group enrollment
  
  // Request
  actType: string;                       // "Chirurgie genou"
  actCategory: ActCategory;
  plannedDate?: string;
  providerName?: string;
  providerInNetwork: boolean;
  clinicalJustification: string;
  
  // Source
  source: ClaimSource;
  
  // Documents
  documents: RequestDocument[];
  
  // Lifecycle
  status: AutorisationStatus;
  submittedAt: string;
  expiresAt: string;                     // submittedAt + 15 calendar days
  respondedAt?: string;
  respondedBy?: string;
  
  // Decision
  authorizationNumber?: string;          // "AUTH-STAR-2026-00142"
  rejectionReason?: string;
  conditions?: string;
  
  // Internal
  internalNotes?: string;
}

type AutorisationStatus =
  | 'EN_ATTENTE'                         // received, not opened
  | 'EN_EXAMEN'                          // opened by admin
  | 'APPROUVEE'
  | 'APPROUVEE_AUTO'                     // 15-day silence rule triggered
  | 'REFUSEE';
```

### 3.7 Demande de Remboursement

```typescript
interface DemandeRemboursement {
  id: string;
  companyId: string;
  
  // Patient
  patientName: string;
  patientMemberId: string;
  planTierName: string;
  employerName?: string;                 // if group enrollment
  contractId?: string;                   // CorporateContract reference
  
  // Facture
  factureNumber: string;
  factureDate: string;
  providerName: string;
  providerType: 'CLINIQUE' | 'MEDECIN' | 'KINE' | 'INFIRMIER' | 'AUTRE';
  providerInNetwork: boolean;
  actCategory: ActCategory;
  actDescription: string;
  totalAmount: number;                   // TND
  
  // Linked authorization (if applicable)
  priorAuthorizationRef?: string;        // auth number
  
  // Source
  source: ClaimSource;
  
  // Documents
  documents: RequestDocument[];
  
  // Lifecycle
  status: DemandeStatus;
  submittedAt: string;
  actDate: string;
  lastUpdatedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  
  // Decision
  approvedAmount?: number;               // TND
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;
  conditions?: string;
  
  // Risk
  flags: ClaimFlag[];
  riskScore: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  
  // Cross-company flag (only visible to FTUSA_ADMIN — set if opted-in companies share)
  crossCompanyDuplicateDetected?: boolean;
  
  // Internal
  internalNotes?: string;
}

type DemandeStatus =
  | 'SOUMISE'
  | 'DOCUMENTS_INCOMPLETS'
  | 'EN_EXAMEN'
  | 'APPROUVEE'
  | 'APPROUVEE_PARTIELLEMENT'
  | 'APPROUVEE_AUTO'
  | 'REFUSEE';

type ClaimFlag =
  | 'DOCUMENTS_MANQUANTS'
  | 'DOUBLON_SUSPECT'
  | 'MONTANT_ELEVE'
  | 'AUTORISATION_MANQUANTE'
  | 'DELAI_SOUMISSION'
  | 'SEUIL_REASSURANCE'
  | 'PRESTATAIRE_HORS_RESEAU';

type RejectionReason =
  | 'DOCUMENT_MANQUANT'
  | 'ACTE_NON_COUVERT'
  | 'DOUBLON'
  | 'PLAFOND_ATTEINT'
  | 'AUTORISATION_MANQUANTE'
  | 'DELAI_DEPASSE'
  | 'PRESTATAIRE_NON_AGREE'
  | 'MONTANT_NON_CONFORME'
  | 'FRAUDE_SUSPECTEE'
  | 'AUTRE';
```

### 3.8 Request Document

```typescript
interface RequestDocument {
  id: string;
  type: DocumentType;
  label: string;
  fileUrl: string;                       // demo: mock URL or template ID
  uploadedAt: string;
  uploadedBy: 'PATIENT' | 'ADMIN' | 'EMPLOYER';
  status: 'RECU' | 'MANQUANT' | 'DEMANDE';
}

type DocumentType =
  | 'FACTURE'
  | 'BULLETIN_DE_SOINS'
  | 'ORDONNANCE'
  | 'CERTIFICAT_MEDICAL'
  | 'COMPTE_RENDU_OPERATOIRE'
  | 'AUTRES';
```

### 3.9 Provider (Réseau Agréé)

```typescript
interface ProviderNetworkEntry {
  id: string;
  companyId: string;
  
  providerName: string;
  providerType: 'CLINIQUE' | 'MEDECIN' | 'KINE' | 'INFIRMIER' | 'CABINET_DENTAIRE' | 'LABORATOIRE' | 'AUTRE';
  specialties: string[];
  city: string;
  region: string;
  
  networkStatus: 'AGREE' | 'EN_COURS_AGREMENT' | 'HORS_RESEAU';
  tiersPayantEnabled: boolean;
  agreedSince?: string;
  
  // Stats
  claimsThisYear: number;
  totalReimbursedThisYear: number;
}
```

### 3.10 Communication (FTUSA broadcast)

```typescript
interface Communication {
  id: string;
  
  // Sender (always FTUSA_ADMIN)
  sentBy: string;
  sentAt: string;
  
  // Categorization
  category: 'ALERTE_FRAUDE' | 'REGLEMENTAIRE' | 'ANNONCE_SYSTEME' | 'INFORMATION';
  priority: 'INFO' | 'IMPORTANT' | 'URGENT';
  
  // Content
  subject: string;
  body: string;                          // markdown supported
  
  // Recipients
  recipientCompanyIds: string[];         // [] = all companies
  
  // Read tracking
  readReceipts: ReadReceipt[];
  
  // Disclaimer
  isMandatory: false;                    // always informational only — legal protection
}

interface ReadReceipt {
  companyId: string;
  readBy: string;                        // admin name
  readAt: string;
}
```

---

## 4. FTUSA_ADMIN — Tableau de Bord Marché

Landing page for FTUSA_ADMIN. Aggregate cross-company view (only companies that opted in to market analytics).

### 4.1 KPI overview (top row)

| Card | Value |
|---|---|
| Compagnies actives | 8 sur 24 (mock) |
| Demandes ce mois (marché) | aggregate count |
| Volume reçu via OmniCare | count + % du total |
| Taux d'approbation marché | % |
| Délai moyen marché | jours |
| Fraudes détectées (marché) | count |
| Compagnies hors délai SLA | count |

### 4.2 Insight cards (replacing vanity KPIs)

Mix of intelligence types — each card has an icon, headline, supporting data, and a suggested action.

**Card examples:**

```
🚨 ALERTE FRAUDE INTER-COMPAGNIES
Doublon détecté entre STAR et COMAR
Patient: hash#a3f9... · Montant: 8,400 TND
→ [Examiner le cas]

📈 CROISSANCE MARCHÉ
Volume demandes OmniCare: +127% YoY
Forte adoption — informer les compagnies

⚠️ COMPAGNIES À RISQUE OPÉRATIONNEL
5 compagnies n'ont pas mis à jour leurs plafonds 2026
→ [Envoyer une communication]

🏢 CONCENTRATION CORPORATE
18% des demandes marché proviennent de 10 employeurs
Tunisie Telecom, Poulina, BIAT en tête

🌐 COUVERTURE NATIONALE
Présence dans 18/24 gouvernorats
Tozeur, Kébili, Tataouine sous-représentés

📊 CATÉGORIE EN CROISSANCE
Maternité: +45% ce trimestre
Opportunité produit à signaler aux compagnies
```

### 4.3 Activity feed

Last 10 cross-company events:
```
22/05/2026 09:42  STAR — Demande approuvée 4,000 TND
22/05/2026 09:38  COMAR — Autorisation préalable expirée → auto-approuvée
22/05/2026 09:15  GAT — Nouveau dossier fraude détecté
...
```

---

## 5. FTUSA_ADMIN — Compagnies

Management of all insurance company tenants on the platform.

### 5.1 Companies list

| Compagnie | Code | Statut | Admin | Dernière connexion | Adhésion partage |
|---|---|---|---|---|---|
| STAR Assurances | STAR | 🟢 Active | ahmed.direche@star.com.tn | Aujourd'hui 09:14 | ✅ Fraude + Analytics |
| COMAR Assurances | COMAR | 🟢 Active | sami.bouzid@comar.tn | Hier 16:42 | ✅ Fraude · ❌ Analytics |
| GAT Assurances | GAT | 🟢 Active | leila.kammoun@gat.tn | Il y a 3 jours | ❌ Aucun partage |
| Maghrebia | MAG | 🟡 Onboarding | — | — | — |
| CARTE Assurances | CARTE | 🔴 Suspendue | — | Il y a 18 jours | — |

Actions per row: `Gérer` / `Suspendre / Réactiver` / `Réinitialiser accès`

### 5.2 Onboarding Wizard — 5 Steps

Triggered by FTUSA_ADMIN clicking "Nouvelle compagnie".

---

**Step 1 — Informations compagnie**
```
Nom de la compagnie:         [STAR Assurances              ]
Code court (pour références): [STAR                          ]
Numéro CGA:                   [_______________              ]
Numéro INPDP:                 [_______________              ]
Email contact:                [_______________              ]
Téléphone:                    [_______________              ]
Adresse:                      [_______________              ]
                              [Logo: 📤 Téléverser]

[Suivant →]
```

---

**Step 2 — Création du compte administrateur**
```
Nom complet de l'admin:       [_______________              ]
Email professionnel:          [_______________              ]
Téléphone direct (optionnel): [_______________              ]

Un mot de passe temporaire sera généré et envoyé par email.

[← Précédent]  [Suivant →]
```

---

**Step 3 — Premier plan tarifaire**
```
Configurez au moins un plan pour démarrer.
Modèles disponibles:

  ○ Modèle "Basique"   — 25% couverture moyenne
  ● Modèle "Confort"   — 40% couverture moyenne (recommandé)
  ○ Modèle "Premium"   — 60% couverture moyenne
  ○ Plan personnalisé  — configuration manuelle

[Aperçu du modèle Confort]
─────────────────────────────────────
Consultations généraliste:  40%
Consultations spécialiste:  35%
Chirurgie:                  50%  (plafond 10,000 TND)
Kinésithérapie:             40%  (plafond annuel 1,500 TND)
Dentaire:                   30%  (plafond annuel 300 TND)
─────────────────────────────────────

D'autres plans peuvent être ajoutés ultérieurement depuis Configuration.

[← Précédent]  [Suivant →]
```

---

**Step 4 — Import des adhérents (optionnel)**
```
Vous pouvez importer la liste des adhérents existants maintenant
ou plus tard depuis la section Adhérents.

📤 Téléverser fichier CSV / Excel
   Modèle: [Télécharger modèle.xlsx]
   
   Format attendu:
   - Nom complet
   - Numéro de police
   - Matricule adhérent
   - Plan attribué
   - Employeur (optionnel)
   - Matricule employé (optionnel)

[Passer cette étape]      [← Précédent]  [Suivant →]
```

---

**Step 5 — Activation**
```
Récapitulatif de l'intégration

Compagnie:              STAR Assurances (STAR)
Administrateur:         Ahmed Direche (ahmed.direche@star.com.tn)
Plans configurés:       1 (Confort)
Adhérents importés:     0 (à importer plus tard)

Adhésions cross-compagnies (peuvent être modifiées ensuite):
  ☐ Partager les signaux de fraude avec FTUSA (ALFA)
  ☐ Inclure les données dans l'analytique marché agrégée

⚠️ Ces partages requièrent un accord contractuel séparé.
   Les valeurs par défaut sont à OFF (opt-in explicite).

[← Précédent]  [✅ Activer la compagnie]
```

After activation: company appears in list as `Active`, admin receives email (mocked in demo).

---

## 6. FTUSA_ADMIN — Analytique Marché

Cross-company analytics. Only includes companies that opted in to market data sharing.

### 6.1 Sections

**Volumes**
- Demandes par mois — toutes compagnies (bar chart, 12 months)
- Répartition par compagnie (donut)
- Répartition par canal source (OmniCare / Manuel / Website / Email / Import)

**Performance**
- Délai moyen par compagnie (horizontal bar — **anonymized labels** per CEO roast fix: "Compagnie A, B, C..." OR opted-in companies shown by name)
- Taux d'approbation par compagnie
- SLA compliance rate

**Catégories d'actes**
- Top 10 catégories par volume (marché)
- Top 10 catégories par montants
- Évolution trimestrielle des catégories

**Géographie**
- Répartition demandes par région
- Régions sous-représentées (heatmap)

**Tendances**
- Croissance / décroissance par catégorie YoY
- Saisonnalité (matin / soir / fin de mois patterns)

### 6.2 Anonymous benchmarking note

Above every comparison chart:
```
ℹ️ Les comparaisons inter-compagnies sont affichées de manière anonymisée par défaut.
   Seules les compagnies ayant accepté le partage des analytiques sont incluses.
   Aucune compagnie ne peut voir les chiffres détaillés d'une autre compagnie.
```

This addresses the CEO roast: no public league table that pits members against each other.

---

## 7. FTUSA_ADMIN — Fraude & Risque (Cross-Compagnies)

Critical FTUSA function. Only includes companies that opted in to fraud signal sharing.

### 7.1 Header

```
Centre de détection inter-compagnies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Intégration ALFA (Agence de Lutte contre la Fraude — FTUSA)
Statut: Phase 2 — intégration prévue
Données partagées: signaux anonymisés uniquement (hash patient + hash facture)

Compagnies participant au partage de fraude: 6 / 24
[Voir la liste]
```

The CEO roast removed the fake "Synchronisation active" badge — replaced with the honest "Phase 2 — intégration prévue".

### 7.2 KPI cards

| KPI | Mock value |
|---|---|
| Doublons inter-compagnies détectés ce mois | 3 |
| Compagnies participantes au partage | 6 |
| Prestataires apparaissant dans plusieurs alertes | 4 |
| Économies marché estimées | 28,400 TND |
| Cas transmis à ALFA (Phase 2) | 0 — en attente intégration |

### 7.3 Cross-company duplicate detection table

For opted-in companies only:

```
🚨 DOUBLON INTER-COMPAGNIE
Hash patient: a3f9c2d1...
Facture identique soumise à:
  • STAR Assurances    — Demande #DEM-2026-00089 — 8,400 TND — Soumise 22/05
  • COMAR Assurances   — Demande #DEM-2026-00134 — 8,400 TND — Soumise 23/05
[Notifier les deux compagnies]
```

Detection logic (demo): hash of `patientName + factureNumber + factureDate + totalAmount`. If hash collision across companies → alert.

For demo: 2-3 mock cross-company alerts hardcoded.

### 7.4 Suspicious provider patterns

Providers appearing in fraud flags across multiple companies:
```
Clinique XYZ — Tunis
  • Flaggée par STAR (3 dossiers, MONTANT_ELEVE)
  • Flaggée par GAT (2 dossiers, DOCUMENTS_MANQUANTS)
  • Flaggée par COMAR (1 dossier, DOUBLON_SUSPECT)
Recommandation: examen approfondi
[Créer un signalement ALFA]
```

---

## 8. FTUSA_ADMIN — Export d'Activité

Renamed from "Rapport CGA" per CEO roast. Neutral data extract — explicitly NOT a CGA regulatory report.

### 8.1 Layout

```
┌────────────────────────────────────────────────────┐
│  Export d'activité                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                    │
│  ℹ️ Données d'activité OmniCare uniquement.        │
│     Ne constitue pas un rapport réglementaire.     │
│     Les compagnies doivent compléter avec leurs    │
│     données internes avant tout dépôt CGA.         │
│                                                    │
│  Période:    [01/04/2026] → [30/06/2026]          │
│  Compagnies: [Toutes ▼]                            │
│  Format:     [CSV ▼]                              │
│                                                    │
│  Aperçu agrégé:                                    │
│  ─────────────────────────────────────             │
│  • Demandes traitées:           1,847              │
│  • Montants approuvés:    4,820,150 TND            │
│  • Montants refusés:        612,400 TND            │
│  • Taux d'approbation:           86.4%             │
│  • Délai moyen traitement:       6.1 jours         │
│                                                    │
│  [📥 Télécharger le fichier]                       │
└────────────────────────────────────────────────────┘
```

### 8.2 Demo behavior

Click "Télécharger" → generates mock CSV with 50 rows of sample data → browser download via Blob.

---

## 9. FTUSA_ADMIN — Communications

Broadcast system to send messages to ASSURANCE_ADMINs.

### 9.1 Inbox view (messages sent)

```
[+ Nouveau message]

🔴 URGENT · Alerte Fraude
Nouveau schéma détecté: factures dupliquées (Clinique XYZ)
Envoyé il y a 2 jours · Lu par 22 / 24 compagnies
[Voir les destinataires] [Voir détail]

🟠 IMPORTANT · Mise à jour réglementaire
Plafonds CNAM 2026 — révision recommandée des plans
Envoyé il y a 5 jours · Lu par 18 / 24 compagnies

⚪ INFO · Annonce système
Nouvelle fonctionnalité: import CSV des adhérents
Envoyé il y a 8 jours · Lu par 24 / 24 compagnies ✅
```

### 9.2 Message composer

```
Nouveau message

Catégorie:
  ○ Alerte Fraude (🚨)
  ○ Réglementaire (⚖️)
  ○ Annonce Système (📢)
  ● Information Générale (ℹ️)

Priorité:
  ○ Urgent — déclenche popup à la connexion
  ○ Important — banner sur le tableau de bord
  ● Info — notification standard

Destinataires:
  ● Toutes les compagnies (24)
  ○ Sélection: [STAR] [COMAR] [GAT] [...]

Objet:
  [_________________________________________________]

Message:
  [                                                ]
  [                                                ]
  [                                                ]
  [Markdown supporté]

⚠️ Tous les messages sont à titre informatif et non contraignants
   sur le plan contractuel ou réglementaire.

[Envoyer]
```

### 9.3 Read receipts detail

Click "Voir les destinataires" on a message:

```
Message: Plafonds CNAM 2026 — révision recommandée
Envoyé: 17/05/2026 14:32

✅ Lu (18)
  STAR Assurances        Ahmed Direche      17/05/2026 14:48
  COMAR Assurances       Sami Bouzid        17/05/2026 15:12
  GAT Assurances         Leila Kammoun      18/05/2026 09:03
  ... (continues)

⏳ Non lu (6)
  Lloyd Tunisien
  CARTE Assurances
  Zitouna Takaful
  ... (continues)

[Rappel automatique aux non-lecteurs]
```

This gives FTUSA the legal protection (proof of who received what).

### 9.4 ASSURANCE_ADMIN side — receiving messages

When ASSURANCE_ADMIN logs in:
- Bell icon shows unread count
- Urgent messages trigger a popup on login
- Important messages show as banner on dashboard top
- Info messages appear in their own "Communications" section

---

## 10. FTUSA_ADMIN — Paramètres Plateforme

Platform-wide settings managed by FTUSA.

### 10.1 Sections

**Compagnies FTUSA**
- Liste des compagnies membres FTUSA (24 par défaut)
- Ajouter / désactiver une compagnie depuis la liste officielle FTUSA

**Catégories d'actes système**
- Liste des ActCategory disponibles
- Ajouter une catégorie nécessite FTUSA_ADMIN
- Renommer ou désactiver une catégorie

**Paramètres globaux**
- SLA marché minimum (jours) — toutes les compagnies doivent respecter ce minimum
- Catégories obligatoirement soumises à autorisation préalable (FTUSA peut imposer un plancher: chirurgie + hospitalisation toujours requises, même si une compagnie tente de les retirer)
- Délai légal d'auto-approbation (15 jours par défaut — modifiable si la loi change)

**Roadmap visible**
Section informative montrant les futures évolutions:
- ✅ Phase 1 (Actuelle) — gestion claims, autorisations, multi-tenant
- 🔄 Phase 2 (Q3 2026) — intégration ALFA réelle, support arabe (RTL)
- 📅 Phase 3 (Q1 2027) — tiers-payant temps réel, intégration cliniques
- 📅 Phase 4 (2027) — workflow réassurance, intégration CGA officielle

---

## 11. ASSURANCE_ADMIN — Tableau de Bord

Landing for an insurance company admin. Their company only.

### 11.1 KPI cards

| KPI | Value |
|---|---|
| Demandes reçues ce mois | count |
| En attente de traitement | count |
| Autorisations en attente | count + countdown |
| Délai moyen traitement | jours |
| Taux d'approbation | % |
| Montant remboursé ce mois | TND |
| Demandes en retard SLA | count |

### 11.2 Insight cards

A rotating selection from this library, populated based on company data:

```
📈 OPPORTUNITÉ DE CROISSANCE
Kinésithérapie +34% ce trimestre
3 nouveaux prestataires ajoutés à votre réseau
→ Envisager une offre dédiée

⚠️ RISQUE OPÉRATIONNEL
Plafond annuel Dentaire atteint pour 12 adhérents
Refus prévisibles dans les 30 prochains jours
→ Communiquer avec ces adhérents en amont

🐢 PERFORMANCE
Vos délais sont 2.3 jours au-dessus de la moyenne marché
(comparaison anonyme — vous voyez votre position uniquement)
→ Voir la répartition par catégorie

🔴 ALERTE FRAUDE
3 doublons détectés cette semaine (vs 1 la semaine précédente)
Concentration sur Optique
→ Examiner les prestataires concernés

💰 IMPACT FINANCIER
Économies règles tarifaires ce mois: 8,400 TND
12% des montants facturés rejetés à juste titre

📊 CONCENTRATION PRESTATAIRES
3 prestataires génèrent 28% de vos demandes
Risque de dépendance — diversifier le réseau recommandé

🏢 ALERTE CONTRAT GROUPE
Contrat BIAT (562 salariés) expire dans 47 jours
Ratio sinistres: 29.3% — favorable
→ Préparer le dossier de renouvellement

📉 BAISSE ANORMALE
Hospitalisation: -22% vs trimestre précédent
Investiguer: saisonnier ou structurel?

⏰ DEMANDES EN RETARD
7 dossiers dépassent le délai SLA
3 sont prêts à décider
→ Prioriser

🌍 RÉPARTITION GÉOGRAPHIQUE
68% des demandes proviennent du Grand Tunis
Sfax en croissance: +18% ce trimestre

🏆 TOP CATÉGORIE
Consultations généralistes: 462 demandes ce mois
Taux d'approbation 94% — votre catégorie la plus stable

📥 NOUVEAUX CANAUX
22% des demandes ce mois via canal MANUEL (vs 14% le mois précédent)
Vérifier la cause (panne OmniCare ? campagne email ?)

📨 COMMUNICATION FTUSA
2 messages FTUSA non lus
Dont 1 Important — Plafonds CNAM 2026
→ Consulter

🚨 SIGNAL ALFA
Prestataire Clinique XYZ signalé par 2 autres compagnies
→ Vérifier vos dossiers récents
```

### 11.3 Quick actions panel

```
Actions rapides
─────────────────────
[+ Nouvelle demande manuelle]
[📤 Importer un lot CSV]
[📊 Voir demandes en retard]
[📨 Envoyer relance prestataire]
```

---

## 12. ASSURANCE_ADMIN — Demandes (Claims Queue)

Main working screen.

### 12.1 Source channel badges

Every claim shows where it came from:

| Source | Badge color | Icon |
|---|---|---|
| `OMNICARE` | Green | 📱 |
| `MANUEL` | Blue | ✍️ |
| `IMPORT_CSV` | Orange | 📤 |
| `WEBSITE` | Purple | 🌐 |
| `EMAIL` | Gray | 📧 |
| `AUTRE` | Light gray | ❓ |

### 12.2 Filters

Status / Date range / Act category / Plan tier / Amount range / Risk score / Flags / **Source (channel)** / Employer (corporate) / Provider in network

### 12.3 Claim card

```
┌────────────────────────────────────────────────────────────────┐
│ 🔴 ÉLEVÉ   📱 OmniCare                                          │
│ Ahmed Ben Ali · Confort · #AH-789 · 🏢 Tunisie Telecom        │
│ Chirurgie genou · Clinique Carthage · 10,000 TND              │
│ Soumise il y a 3 jours · ⏱ J+3/10 SLA 🔴                      │
│ [AUTORISATION_MANQUANTE] [MONTANT_ELEVE]                       │
│                                            [Ouvrir →]          │
└────────────────────────────────────────────────────────────────┘
```

Includes: risk score · source badge · patient + plan + employer (if group) · act + provider + amount · SLA · flags · open.

### 12.4 Claim detail — 5 tabs

**Tab 1 — Dossier**
- Patient: name, member ID, plan tier, employer (if group), enrollment date
- Source: badge + arrival timestamp
- Facture: number, date, provider, network status, amount
- Linked authorization: ref + status (if applicable)
- Filing deadline check
- Reinsurance threshold flag

**Tab 2 — Documents PDF**
- Each document with status (RECU / MANQUANT / DEMANDE)
- "Voir" button opens mock PDF in modal
- "Demander ce document" sends patient/employer notification (mocked)

**Tab 3 — Contexte adhérent**
- All claims this patient submitted this year
- Total reimbursed this year
- Annual budget remaining per category
- Previous flags

**Tab 4 — Contexte employeur** *(if group enrollment)*
- Group contract details
- All claims from this employer this year (aggregate)
- Claims ratio
- Days until renewal
- "Cette demande affecte: ratio sinistres employeur"

**Tab 5 — Activité dossier**
- Full timeline of dossier events

### 12.5 Action panel (right side)

```
┌─────────────────────────────────┐
│  DÉCISION                       │
│                                 │
│  Montant facturé: 10,000 TND   │
│  Montant à approuver:           │
│  [________] TND                 │
│                                 │
│  [💡 Calculateur de couverture] │
│                                 │
│  Notes internes:                │
│  [_______________________]      │
│                                 │
│  [✅ Approuver]                 │
│  [⚠️ Approbation partielle]     │
│  [📄 Demander documents]        │
│  [❌ Refuser]                   │
└─────────────────────────────────┘
```

### 12.6 Coverage calculator helper

Side panel showing plan rules for the relevant category. Reference only — admin can override.

### 12.7 New manual claim

`[+ Nouvelle demande manuelle]` button opens a form:

```
Source: MANUEL (verrouillé)
Adhérent:    [Rechercher par nom ou ID ▼]
Type d'acte: [Catégorie ▼]
Prestataire: [Nom + sélection réseau]
Date d'acte: [__/__/____]
Montant:     [_______] TND
Description: [_______________]

Documents:
  [📤 Téléverser facture (PDF)]
  [📤 Téléverser bulletin de soins (PDF)]
  [📤 Téléverser autres documents]

[Créer la demande]
```

For demo: form creates a new demande in localStorage with source `MANUEL`.

### 12.8 CSV bulk import

`[📤 Importer un lot CSV]` button:
```
Téléverser un fichier CSV de demandes en lot

Format attendu:
  - Matricule adhérent
  - Type d'acte
  - Prestataire
  - Date acte
  - Montant
  - Numéro facture

[Télécharger le modèle.csv]

📤 Choisir un fichier
```

For demo: mock parser reads a CSV file, creates entries with source `IMPORT_CSV`.

---

## 13. ASSURANCE_ADMIN — Autorisations Préalables

Same as v3 §6 — kept intact.

Key points:
- Separate queue from claims
- 15-day auto-approval rule
- Authorization number format: `AUTH-STAR-2026-00142`
- Same multi-source intake (a patient can submit a prior auth from OmniCare OR manually via insurer's website)

---

## 14. ASSURANCE_ADMIN — Adhérents

Member list with corporate enrollment context.

### 14.1 List columns

| Nom | Matricule | Police | Plan | Type | Employeur | Statut | Demandes (année) | Remboursé (année) |
|---|---|---|---|---|---|---|---|---|
| Ahmed Ben Ali | AH-789 | POL-2026-001 | Confort | 🏢 Groupe | Tunisie Telecom | ✅ | 4 | 6,200 TND |
| Sonia Gharbi | SG-456 | POL-2026-082 | Premium | 👤 Individuel | — | ✅ | 8 | 12,400 TND |
| Karim Mansour | KM-321 | POL-2025-451 | Basique | 🏢 Groupe | BIAT | ⏳ En attente | 0 | 0 |

Filters: status / plan / employer / source

### 14.2 Verification queue

`⏳ En attente` adhérents shown separately for quick approval. One-click "Vérifier".

### 14.3 Member detail (slide-out)

- Personal + plan + employer info
- Annual budget per category (progress bars)
- Recent claims (last 5)
- Prior auth history
- Flag history

---

## 15. ASSURANCE_ADMIN — Entreprises (Group Contracts — REAL FEATURE)

Group contracts are first-class entities in v4. This is no longer credibility-only.

### 15.1 Contracts list

| Employeur | Secteur | Salariés | Inscrits | Plans | Primes annuelles | Remboursé YTD | Ratio | Statut |
|---|---|---|---|---|---|---|---|---|
| Tunisie Telecom | Télécoms | 847 | 712 | Confort, Premium | 966,045 TND | 312,400 TND | 32.3% | 🟢 Actif |
| Société Poulina | Agroalimentaire | 1,243 | 1,098 | Premium | 2,694,120 TND | 876,500 TND | 32.5% | 🟢 Actif |
| BIAT | Banque | 562 | 489 | Basique | 304,236 TND | 89,200 TND | 29.3% | 🟠 Expire dans 47 jours |

Filters: status / sector / renewal date (next 90 days)

### 15.2 Contract detail

```
TUNISIE TELECOM — Contrat groupe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Contrat
   Début:        01/01/2026
   Fin:          31/12/2026
   Préavis:      01/10/2026 (alerte 60 jours avant)
   
   Effectif:     847 salariés
   Inscrits:     712 (84%)
   Plans:        Confort (cadres) + Premium (direction)
   Prime totale: 966,045 TND / an

📊 Activité (année en cours)
   Demandes:           142
   Approuvées:         126 (89%)
   Refusées:            16 (11%)
   Total remboursé:    312,400 TND
   Ratio sinistres:    32.3%  (favorable — moyenne marché 35%)

📈 Évolution mensuelle
   [Bar chart: monthly reimbursements]

🏥 Top prestataires utilisés
   1. Clinique Carthage     — 38 demandes — 124,000 TND
   2. Centre Kiné El Menzah — 22 demandes —  18,400 TND
   3. Cabinet Dr. Trabelsi  — 18 demandes —   3,200 TND
   ...

👥 Salariés assurés (extrait)
   [Lien vers vue filtrée Adhérents par employeur]

🔁 Renouvellement
   Statut: à 47 jours du préavis
   Recommandations système:
   ✓ Ratio favorable — opportunité de revoir les conditions
   ✓ Pas de fraude détectée sur ce groupe
   ⚠ Concentration: 27% des demandes sur Clinique Carthage

[Préparer le dossier de renouvellement]
[Exporter le rapport employeur]
```

### 15.3 Renewal alerts

Contracts with `EXPIRATION_PROCHE` status appear as alerts on the home dashboard and as insight cards.

### 15.4 New contract

`[+ Nouveau contrat groupe]` button — creates a CorporateContract from a form.

---

## 16. ASSURANCE_ADMIN — Réseau Agréé (Credibility Tab)

Per the locked decision: hardcoded credibility tab.

### 16.1 Provider list

Mock data showing 8-12 providers with mixed network status. Filters by type / specialty / region.

### 16.2 Provider card

```
Clinique Carthage
Tunis · Multi-spécialités
✅ Réseau agréé · Tiers-payant disponible
Agréé depuis: 15/03/2024

Demandes cette année: 38
Total remboursé: 124,000 TND
[Voir détail]
```

No real management flow in demo.

---

## 17. ASSURANCE_ADMIN — Fraude & Risque

### 17.1 Section header

```
Détection de fraude — règles internes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Détection cross-compagnies (ALFA — Phase 2)
Statut: ☐ Activer le partage des signaux avec FTUSA
        ⚠️ Nécessite un accord contractuel séparé

Détection ce mois: 7 dossiers signalés
```

### 17.2 KPI cards

Same as v3 §10.2.

### 17.3 Flagged claims table

All claims with active flags from this company. Each row: patient (or anonymous) · amount · flags · risk · status · action.

Action options: "Faux positif", "Confirmer fraude", "Investiguer prestataire", "Transmettre à ALFA (si opt-in)".

### 17.4 Opt-in toggle

Per CEO roast: cross-company fraud sharing is **opt-in per company**:

```
☐ Activer le partage des signaux de fraude avec FTUSA
   
   En activant ce partage:
   ✓ Vos doublons sont détectés à travers les compagnies participantes
   ✓ Les patterns suspects sont signalés inter-compagnies
   ✓ Aucune donnée personnelle n'est partagée (hash anonymisés uniquement)
   
   Cette adhésion fait l'objet d'un accord contractuel à signer
   séparément avec FTUSA.
   
   [Demander l'activation]
```

---

## 18. ASSURANCE_ADMIN — Configuration

Simpler than v3 (one role only).

### 18.1 Sections

**Plans tarifaires**
- Create / edit / archive plan tiers
- Per category: coverage %, claim cap, annual cap, notes
- Auto-approve threshold, reinsurance threshold, claim filing deadline, SLA target
- Prior auth requirements

**Profil compagnie**
- Display name, logo, contact, INPDP number, CGA number

**Paramètres compagnie**
- Activer/désactiver le partage fraude (toggle, contract-gated)
- Activer/désactiver l'inclusion dans l'analytique marché agrégée
- Délai SLA par défaut
- Catégories nécessitant autorisation préalable

---

## 19. ASSURANCE_ADMIN — Analytique

Same structure as v3 §12 but with insight cards layer.

### 19.1 Sections

- KPIs (volume, performance, financial)
- Charts (same as v3)
- Insight cards (deeper analysis — see §11.2)
- Comparaisons marché (anonymous): "votre position vs moyenne marché"
- Exports CSV per chart

---

## 20. localStorage Schema

```typescript
// Platform level
'omnicare_ftusa_companies'                      // InsuranceCompany[]
'omnicare_ftusa_admins'                         // AdminAccount[]
'omnicare_ftusa_communications'                 // Communication[]
'omnicare_ftusa_act_categories'                 // ActCategory metadata
'omnicare_ftusa_platform_settings'              // PlatformSettings

// Per company (multi-tenant)
'omnicare_ins_{companyId}_demandes'             // DemandeRemboursement[]
'omnicare_ins_{companyId}_autorisations'        // AutorisationPrealable[]
'omnicare_ins_{companyId}_adherents'            // Adherent[]
'omnicare_ins_{companyId}_contracts'            // CorporateContract[]
'omnicare_ins_{companyId}_plan_tiers'           // PlanTier[]
'omnicare_ins_{companyId}_network'              // ProviderNetworkEntry[]
'omnicare_ins_{companyId}_settings'             // CompanySettings (opt-ins)

// Session
'omnicare_ftusa_current_user'                   // AdminAccount of logged-in user
```

---

## 21. Demo Login Buttons

```
Démonstration — Choisir un profil

[ 🏛  Connexion FTUSA — Administrateur ]
   → FTUSA_ADMIN avec accès complet plateforme

[ 🏢  Connexion STAR Assurances — Admin ]
   → ASSURANCE_ADMIN pour STAR
   → Tous les sections pré-remplies

[ 🏢  Connexion COMAR Assurances — Admin ]
   → ASSURANCE_ADMIN pour COMAR  
   → Données différentes pour montrer le multi-tenant
```

No patient login in this module (the existing OmniCare patient app handles that side).

---

## 22. Seed Data Summary

### 22.1 Platform
- 1 FTUSA_ADMIN account (Mohamed Khelifa, ftusa-admin@ftusanet.org)
- 24 InsuranceCompany entries (full FTUSA member list)
- 8 marked as `ACTIVE`, others as inactive/onboarding
- 3 sample Communications (one urgent, one important, one info)

### 22.2 STAR Assurances tenant (most populated)
- 1 ASSURANCE_ADMIN account (Ahmed Direche)
- 3 PlanTier (Basique, Confort, Premium)
- 30 Adherent (mix individual + group, mix verified/pending)
- 3 CorporateContract (Tunisie Telecom, BIAT, Poulina)
- 12 ProviderNetworkEntry
- 8 DemandeRemboursement (showing all statuses, sources, risk scores)
- 4 AutorisationPrealable (1 near auto-approval, 1 already auto-approved)

### 22.3 COMAR Assurances tenant (lighter)
- 1 ASSURANCE_ADMIN account (Sami Bouzid)
- 2 PlanTier
- 12 Adherent
- 1 CorporateContract
- 4 DemandeRemboursement
- 2 AutorisationPrealable

### 22.4 Cross-company fraud seed
- 1 cross-company duplicate alert (between STAR and COMAR)
- Visible only in FTUSA_ADMIN fraud section

---

## 23. Mock PDF Templates

3 HTML templates rendered in modal when "Voir PDF" is clicked:

1. **Facture template**: clinic/doctor header, patient info, act description, line items, total
2. **Bulletin de soins template**: structured form with patient #, provider, act code, date, amounts
3. **Ordonnance template**: doctor letterhead, patient, prescribed acts, sessions, date

All styled with the OmniCare design system for visual consistency.

---

## 24. Phase 2 — Roadmap Items Visible in Demo

Visible to FTUSA_ADMIN in Paramètres → Roadmap. Acknowledges the CEO roast feedback honestly:

| Feature | Status | Phase |
|---|---|---|
| Multi-tenant claim management | ✅ Livré | 1 |
| Autorisations préalables + auto-approbation | ✅ Livré | 1 |
| Multi-source intake | ✅ Livré | 1 |
| Cross-company fraud (opt-in) | ✅ Livré | 1 |
| **Intégration ALFA réelle** | 🔄 En cours | 2 (Q3 2026) |
| **Support arabe (RTL)** | 🔄 En cours | 2 (Q3 2026) |
| **Tiers-payant temps réel** | 📅 Planifié | 3 (Q1 2027) |
| **Intégration cliniques (Pulsara-like)** | 📅 Planifié | 3 (Q1 2027) |
| **Workflow réassurance Tunis Re** | 📅 Planifié | 4 (2027) |
| **Intégration CGA officielle** | 📅 Planifié | 4 (2027) |

---

## 25. What This Demo Proves to FTUSA Directors

In order of importance:

1. **The system is FTUSA-owned and operates independently** — multi-source intake, not dependent on OmniCare
2. **Group contracts are first-class** — not bolted on. Renewal cycles, ratio sinistres, employer dashboards
3. **Two-level architecture** — FTUSA federation view + individual company view
4. **15-day auto-approval respected legally** — countdown visible, decision irreversible after expiry
5. **Insight-driven, not vanity dashboards** — every card has an action
6. **Cross-company opt-in for fraud sharing** — respects competitive boundaries
7. **No false claims about ALFA / CGA** — Phase 2 honesty
8. **Onboarding wizard for new companies** — FTUSA can self-serve adding members
9. **Multi-channel** — OmniCare is one source, not the only one
10. **Real data, not just stats** — Tunisie Telecom, Poulina, BIAT shown as real-world examples

---

## 26. Open Items — Production Readiness (Not Demo Blockers)

1. Verify "15-day auto-approval" against actual Tunisian insurance law
2. ALFA integration — coordinate with ALFA director Mohamed Dkhil (per CEO roast)
3. Arabic language support — RTL layout, translation
4. Maintenance and INPDP compliance contract (not just one-time sale)
5. Per-claim API fee structure from OmniCare side (recurring revenue model)
6. Pilot phase with 1 volunteer member company before full FTUSA rollout
7. Group contract architecture refinement (real renewal workflows)
8. Multi-source full implementation (real CSV parser, real email ingestion)
9. PDF OCR — real act code extraction from bulletin de soins

---

*Version 4.0 — Module 17 — OmniCare Architecture — 2026-05-25*
*Incorporates: v3 base + FTUSA_ADMIN role + multi-source intake + group contracts as first-class + 5-step onboarding wizard + categorized communications with read receipts + insight cards library + CEO roast fixes (anonymized comparisons, ALFA Phase 2, neutral CGA export, opt-in cross-company, Arabic roadmap)*
*Next: React + TypeScript + localStorage implementation in new chat session*
