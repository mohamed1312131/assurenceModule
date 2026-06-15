# OmniCare FTUSA Insurance Dashboard

## Non-Technical System Report

**Prepared for:** Business and non-technical readers  
**Source reviewed:** `OmniCare_Module_17_Insurance_Dashboard_v4.md` and the implemented Angular application code  
**Report date:** June 15, 2026  
**Application language:** French user interface, explained here in English  

---

## 1. Executive Summary

The OmniCare FTUSA Insurance Dashboard is a demonstration web platform for managing health insurance claims, prior authorizations, company members, group contracts, provider networks, fraud signals, analytics, exports, and federation communications.

The system is designed for two types of users:

1. **FTUSA administrator:** sees the federation-level view across insurance companies.
2. **Insurance company administrator:** manages the data and work queue for one insurance company only, such as STAR Assurances or COMAR Assurances.

The most important business idea is that this platform is **FTUSA-owned and independent**. OmniCare is only one source of incoming claims. Claims can also arrive manually, by CSV import, company website, email, or another channel.

This current application is a **demo**. It runs without a backend server and stores sample data in the browser. It is built to show the expected business workflows before production development.

---

## 2. What The System Is For

The platform helps FTUSA and member insurance companies organize medical insurance operations in one place.

It supports:

- Receiving and reviewing reimbursement claims.
- Receiving and reviewing prior authorization requests for expensive or sensitive care.
- Managing insured members.
- Managing group insurance contracts for employers.
- Tracking approved medical provider networks.
- Detecting internal and cross-company fraud signals.
- Producing activity exports.
- Sending official FTUSA communications to insurance companies.
- Following dashboards, charts, KPIs, alerts, and operational insights.

The demo is intentionally focused on insurance administration. It does not include a patient account or a doctor account.

---

## 3. Ownership And Data Separation

The platform is presented as an FTUSA-controlled system.

Important separation rules:

- FTUSA administrators see market and federation-level information.
- Insurance company administrators see only their own company area.
- Each company has its own data space, called a tenant.
- Cross-company analytics and fraud sharing depend on opt-in settings.
- OmniCare is a source of claims, not the owner or controller of all data.

This is important for trust: each company can manage its own operations while FTUSA can supervise market-level activity where sharing is permitted.

---

## 4. Demo Accounts

The login screen offers three demo profiles:

| Profile | Role | Purpose |
|---|---|---|
| Mohamed Khelifa | FTUSA administrator | Full federation-level platform access |
| Ahmed Direche | STAR Assurances administrator | Company-level demo tenant for STAR |
| Sami Bouzid | COMAR Assurances administrator | Company-level demo tenant for COMAR |

There is no password flow in the demo. The user chooses a profile and enters the matching area.

---

## 5. Main Business Objects

The system is organized around these business objects:

| Object | Meaning |
|---|---|
| Insurance company | A member insurer such as STAR, COMAR, GAT, BH, or AMI |
| Administrator account | A user who manages either FTUSA or one insurer |
| Plan tier | An insurance plan such as Basic, Comfort, or Premium |
| Coverage rule | The percentage and limits applied to each medical act category |
| Member | An insured person attached to an individual or group policy |
| Group contract | An employer insurance contract, for example Tunisie Telecom or BIAT |
| Reimbursement claim | A request to reimburse care that already happened |
| Prior authorization | A request to approve care before it happens |
| Document | Mock medical documents such as invoice, care form, prescription, or certificate |
| Provider | A doctor, clinic, lab, dental office, nurse, or physiotherapy provider |
| Communication | A message sent by FTUSA to insurance companies |

---

## 6. Main Workflow

A typical reimbursement flow works like this:

1. A claim enters the system from OmniCare, manual entry, CSV import, website, email, or another source.
2. The insurance company administrator sees it in the claims queue.
3. The claim displays patient, plan, employer, provider, amount, source, risk level, and flags.
4. The administrator opens the claim detail page.
5. The administrator reviews the file, documents, member history, employer context, and activity timeline.
6. The system shows coverage rules to help calculate the amount.
7. The administrator approves, partially approves, requests more documents, or refuses the claim.
8. Dashboards and analytics update using the stored demo data.

A typical prior authorization flow works like this:

1. A prior authorization request enters the system.
2. It appears in a separate authorization queue.
3. The administrator sees a countdown to the legal deadline.
4. The administrator reviews the patient, planned act, provider, justification, documents, member context, and timeline.
5. The administrator approves, approves with conditions, or refuses.
6. If an open authorization passes its deadline, the demo applies automatic approval and generates an authorization number.

---

## 7. FTUSA Administrator Area

The FTUSA area is the federation-level workspace. It is reached after choosing the FTUSA administrator profile.

### 7.1 Market Dashboard

Purpose: give FTUSA a high-level view of the insurance market activity included in the demo.

What it shows:

- Active companies versus total companies.
- Claims received this month.
- Claim volume coming through OmniCare.
- Market approval rate.
- Average market processing delay.
- Number of flagged fraud cases.
- Companies above their SLA target.
- Market volume chart by month.
- OmniCare channel evolution chart.
- SLA performance by company.
- Recent activity feed.
- Insight cards with suggested actions.

Business value:

- FTUSA can quickly understand market activity, delays, risk, and adoption of the OmniCare channel.
- The page emphasizes aggregated and opt-in data, not unrestricted access to every insurer's private information.

### 7.2 Companies

Purpose: manage insurance company tenants.

What it shows:

- List of FTUSA member companies.
- Company name, code, status, administrator email, last login, and sharing status.
- Filters by status and search by company name or code.

Available actions:

- Open and manage a company tenant.
- Suspend a company.
- Reactivate a company.
- Simulate administrator access reset.
- Start onboarding for a new company.

The onboarding wizard includes:

1. Company information.
2. Administrator account information.
3. First plan tier setup.
4. Optional member CSV import.
5. Activation with fraud and analytics opt-in choices.

Business value:

- FTUSA can add and supervise member companies in the platform.
- Sharing is explicitly opt-in, which respects commercial boundaries between insurers.

### 7.3 Market Analytics

Purpose: analyze activity across participating companies.

What it shows:

- Claims by month.
- Source channel split: OmniCare, manual, website, email, CSV import.
- Channel evolution over time.
- Volume by company.
- Average processing delay by company versus SLA.
- Approval rate by company.
- Top medical act categories by volume.
- Top categories by amount.
- Cross-company duplicate fraud trend.

Available actions:

- Export each chart to CSV.

Business value:

- FTUSA can monitor market behavior, delays, categories, and source channels.
- The page supports market intelligence while keeping comparisons limited to opt-in participants.

### 7.4 Fraud And Risk

Purpose: detect cross-company fraud signals.

What it shows:

- ALFA integration status as "Phase 2, integration planned."
- Number of companies participating in fraud sharing.
- Duplicate claims detected across companies.
- Suspicious provider patterns.
- Estimated savings from detected duplicates.
- Cases transmitted to ALFA shown as zero because live integration is not part of the demo.

Available actions:

- View the participating companies list.
- Simulate notification to affected companies.
- Simulate creating an ALFA signal.

Business value:

- FTUSA can show how inter-company fraud detection would work.
- The demo is careful not to claim that ALFA is already live.
- Shared data is described as anonymized signals, such as hashes, not raw patient data.

### 7.5 Activity Export

Purpose: create a neutral activity extract.

What it shows:

- Date range filters.
- Company filter.
- CSV format option.
- Aggregated preview: treated claims, approved amounts, refused amounts, approval rate, and average delay.

Available actions:

- Download a CSV file with up to 50 sample activity rows.

Important note:

- This page clearly states that the export is not a regulatory CGA report.
- Companies must complete it with their internal data before any official submission.

### 7.6 Communications

Purpose: allow FTUSA to send messages to insurance company administrators.

What it shows:

- Sent messages.
- Priority: urgent, important, or info.
- Category: fraud alert, regulatory, system announcement, or information.
- Read count versus recipient count.

Available actions:

- Compose a new message.
- Send to all companies or selected companies.
- Open message details.
- View read receipts.
- Simulate reminders to companies that have not read the message.

Business value:

- FTUSA can communicate with member insurers and track who read each message.
- Read receipts help prove distribution and awareness.

### 7.7 Platform Settings

Purpose: manage federation-level reference settings.

What it includes:

- Official FTUSA company list.
- Add or deactivate a company.
- Medical act categories.
- Rename, add, activate, or deactivate categories.
- Market minimum SLA.
- Legal automatic approval delay.
- Required prior authorization categories.
- Roadmap phases.

Important rule:

- Surgery and hospitalization are always required prior authorization categories and cannot be removed from the mandatory floor.

---

## 8. Insurance Company Administrator Area

The insurance company area is reached after choosing STAR or COMAR. The administrator sees only that company's tenant.

### 8.1 Company Dashboard

Purpose: daily command center for one insurer.

What it shows:

- Claims received this month.
- Claims waiting for processing.
- Prior authorizations waiting.
- Average processing delay.
- Approval rate.
- Amount reimbursed this month.
- Claims late against SLA.
- Important FTUSA communication banner.
- Urgent FTUSA message popup.
- Insight cards.
- Quick actions.

Quick actions:

- View late claims is active.
- Manual claim, CSV import, and provider reminder quick buttons are displayed as planned future actions on this dashboard, but the claims page itself has working manual claim and CSV import dialogs.

Business value:

- The company administrator can see what needs attention today.
- The dashboard combines operational status, financial information, fraud signals, and FTUSA messages.

### 8.2 Reimbursement Claims

Purpose: main work queue for reimbursement requests.

What it shows:

- Total claims.
- Waiting claims.
- Claims received this month.
- A list of claim cards.
- Each card shows patient, plan, member ID, employer, medical act, provider, amount, source, risk level, status, submission timing, and flags.

Filters:

- Status.
- Source channel.
- Risk level.
- Medical act category.
- Plan tier.
- Employer.
- Provider in approved network.
- Fraud or operational flags.
- Date range.
- Amount range.

Available actions:

- Open a claim.
- Create a manual claim.
- Import claims from CSV.
- Download a CSV template in the import dialog.
- Generate test import rows in the import dialog.

### 8.3 Claim Detail

Purpose: review and decide one reimbursement claim.

Tabs:

| Tab | What it contains |
|---|---|
| File | Patient, source, invoice, provider, network status, amount, linked authorization, filing deadline, reinsurance notice |
| PDF Documents | Mock invoice, care form, and other documents; view received PDFs or request missing documents |
| Member Context | Member history, reimbursed amount this year, annual budgets by category, previous flags |
| Employer Context | Only for group members; group contract, employee coverage, premium, claim ratio, renewal recommendation |
| Activity | Timeline of claim submission, review, document request, and decision |

Decision panel:

- Approve.
- Partially approve.
- Request documents.
- Refuse with a reason.
- Add internal notes.
- View coverage calculation based on the plan rules.

Business value:

- The administrator has enough context to decide fairly and consistently.
- Group contract impact is visible, so claims can be understood in relation to employer contracts.

### 8.4 Prior Authorizations

Purpose: manage pre-approval requests before expensive or sensitive medical care.

What it shows:

- Total authorizations.
- Open authorizations.
- Authorizations received this month.
- Warning when authorizations expire soon.
- Cards showing patient, plan, member ID, act type, provider, source, status, and countdown.

Filters:

- Status.
- Source channel.
- Medical act category.
- Date range.
- Approved network only.

Key feature:

- Open requests automatically become auto-approved if their deadline is passed.
- The demo generates an authorization number when auto-approval is applied.

### 8.5 Authorization Detail

Purpose: review and decide a prior authorization request.

Tabs:

| Tab | What it contains |
|---|---|
| File | Patient, requested act, planned date, provider, clinical justification, source, 15-day legal rule progress |
| PDF Documents | Mock prescription and medical certificate |
| Member Context | Member claims this year, reimbursed amount, authorization history, useful plan rules |
| Activity | Timeline of submission, review, and decision |

Decision panel:

- Approve.
- Approve with conditions.
- Refuse with reason.
- Add conditions and internal notes.

Important behavior:

- Auto-approved authorizations are locked and shown as irreversible in the demo.

### 8.6 Members

Purpose: manage insured members.

What it shows:

- Member name.
- Membership number.
- Policy number.
- Plan tier.
- Enrollment type: individual or group.
- Employer if applicable.
- Verification status.
- Number of claims this year.
- Amount reimbursed this year.
- Source of enrollment.

Filters:

- Verification status.
- Individual or group type.
- Plan tier.
- Employer.
- Source channel.
- Contract ID when opened from a group contract.

Available actions:

- Open member detail drawer.
- Verify pending members.
- Reset filters.

Member detail drawer includes:

- Member identity and coverage.
- Annual budget by medical act category.
- Recent claims.
- Prior authorization history.
- Flag history.

### 8.7 Companies / Group Contracts

Purpose: manage employer group insurance contracts.

What it shows:

- Employer.
- Business sector.
- Number of employees.
- Number of enrolled employees.
- Available plans.
- Annual premium.
- Reimbursed amount year-to-date.
- Claim ratio.
- Contract status.

Filters:

- Status.
- Sector.
- Renewal within 90 days.

Available actions:

- Open contract detail.
- Create a new group contract.

### 8.8 Group Contract Detail

Purpose: understand one employer contract in depth.

What it shows:

- Contract start and end dates.
- Renewal notice date and countdown.
- HR contact.
- Plans attached to the contract.
- Enrollment progress.
- Annual premium.
- Current-year activity.
- Approved and refused claims.
- Reimbursed amount.
- Claim ratio versus market average.
- Monthly reimbursement chart.
- Top providers used by the group.
- Renewal recommendations.

Available actions:

- Open members attached to this contract.
- Prepare renewal file, simulated.
- Export employer report to CSV.
- Export monthly reimbursements to CSV.

Business value:

- Group contracts are treated as a real business feature, not just a note on members.
- Renewal decisions can be supported by claims ratio, provider concentration, and fraud status.

### 8.9 Approved Provider Network

Purpose: view the company's medical provider network.

What it shows:

- Provider name.
- Provider type.
- City and region.
- Network status: approved, in approval process, or out of network.
- Third-party payment availability.
- Approval date when applicable.
- Claims this year.
- Amount reimbursed this year.
- Specialties.

Filters:

- Network status.
- Provider type.
- City or region.
- Third-party payment only.

Available actions:

- Open provider detail dialog.

Current limitation:

- The demo does not create or edit providers from this page.

### 8.10 Fraud And Risk

Purpose: manage internal fraud signals for one insurer.

What it shows:

- Claims flagged this month.
- Confirmed fraud count.
- False positive count.
- Estimated savings.
- List of flagged claims.
- Patient name or anonymized patient label depending on sharing status.
- Amount, flags, risk level, and claim status.
- Whether cross-company sharing is active.

Available actions:

- Mark a flagged claim as false positive.
- Confirm fraud.
- Investigate provider.
- Transmit to ALFA only if sharing is active.
- Request activation of inter-company sharing.

Business value:

- The insurer can work fraud internally.
- Cross-company sharing is controlled and contract-gated.

### 8.11 Configuration

Purpose: configure the insurer's own operational settings.

What it includes:

- Plan tiers.
- Company profile.
- Company sharing and SLA settings.

Plan tier actions:

- Create a plan.
- Edit a plan.
- Archive a plan.
- Configure monthly premium.
- Configure auto-approval threshold.
- Configure reinsurance threshold.
- Configure claim filing deadline.
- Configure SLA target.
- Configure coverage percentages and limits by medical act category.

Company profile fields:

- Company name.
- Contact email.
- Phone.
- Address.
- INPDP declaration number.
- CGA registration number.

Company settings:

- Cross-company fraud sharing toggle.
- Market analytics sharing toggle.
- Default SLA.
- Categories requiring prior authorization.

### 8.12 Company Analytics

Purpose: analyze the insurer's own performance.

What it shows:

- Volume this month.
- Approval rate.
- Average delay.
- Total reimbursed.
- Fraud flags.
- Insight cards.
- Claims by month.
- Source channel distribution.
- Approval rate by month.
- Processing delay by month versus SLA.
- Medical category volume.
- Medical category amount.

Available actions:

- Export charts to CSV.

Business value:

- The insurer can understand trends, workload, source channels, decision performance, and cost concentration.

### 8.13 Communications

Purpose: receive FTUSA messages.

What it shows:

- Messages sent by FTUSA to the company.
- Priority: urgent, important, or info.
- Read or unread state.

Available actions:

- Open a message.
- Mark it as read automatically when opened.

Dashboard behavior:

- Urgent unread messages can appear as a popup on login.
- Important unread messages appear as a dashboard banner.
- The shell shows an unread count badge.

---

## 9. Data Included In The Demo

The demo seeds realistic sample data in the browser.

It includes:

- 24 insurance company entries.
- 8 active companies in the sample market.
- FTUSA administrator account.
- STAR administrator account.
- COMAR administrator account.
- STAR data with plan tiers, members, group contracts, providers, claims, and authorizations.
- COMAR data with its own members, contracts, claims, and authorizations.
- Generated market claims across active companies for 12 months.
- Cross-company duplicate claim examples.
- Three FTUSA communications.
- Platform settings and medical act categories.

Important sample companies and employers include:

- STAR Assurances.
- COMAR Assurances.
- GAT Assurances.
- BH Assurance.
- AMI Assurances.
- Tunisie Telecom.
- BIAT.
- Societe Poulina.
- STEG.

---

## 10. Source Channels Supported

Claims and members can be labeled with their source.

| Source | Meaning |
|---|---|
| OmniCare | Entered through the OmniCare patient app |
| Manual | Entered manually by an insurance administrator |
| CSV Import | Imported in a batch file |
| Website | Came from an insurer website |
| Email | Came from an email or PDF workflow |
| Other | Any other source |

This supports the main strategic message: OmniCare is an input channel, not the only way the platform works.

---

## 11. Important Rules And Controls

### Prior Authorization Deadline

The platform uses a 15-day legal auto-approval concept in the demo. Open prior authorizations are monitored with a countdown. If the deadline passes, the demo automatically changes them to auto-approved.

### SLA Monitoring

The system tracks processing delays and compares them with SLA targets. SLA indicators appear on dashboards, analytics pages, and late-claim insights.

### Fraud Sharing Opt-In

Cross-company fraud detection is not automatic for all insurers. Each company has settings for:

- Fraud signal sharing.
- Market analytics inclusion.

This protects competitive boundaries and supports consent-based data sharing.

### ALFA Status

ALFA integration is shown as a planned Phase 2 feature. The current demo simulates ALFA-related actions but does not connect to a real ALFA system.

### CGA Export Status

The activity export is intentionally named as a neutral activity export. It is not presented as an official CGA regulatory report.

---

## 12. What Works In The Demo

The demo currently supports:

- Role-based navigation.
- FTUSA federation dashboard.
- Insurance company dashboard.
- Company tenant separation.
- Seeded browser data.
- Claims queue and filters.
- Claim detail decisions.
- Mock PDF viewing.
- Manual claim creation.
- CSV claim import.
- Prior authorization queue.
- Prior authorization detail decisions.
- Automatic approval of expired prior authorizations.
- Member list, filters, verification, and detail drawer.
- Group contract list, creation, details, renewal recommendations, and exports.
- Provider network browsing.
- Internal fraud actions.
- FTUSA communications and read receipts.
- Company communications inbox.
- Analytics charts and CSV exports.
- Platform and company configuration.

---

## 13. Current Demo Limitations

The current system is a front-end demo, not a production platform.

It does not currently include:

- Real backend database.
- Real authentication and passwords.
- Real user permission administration beyond demo profiles.
- Real email ingestion.
- Real PDF upload storage.
- Real OCR extraction from PDFs.
- Real ALFA integration.
- Real CGA regulatory submission.
- Real SMS or email sending.
- Real payment or reimbursement transfer.
- Patient login.
- Doctor, clinic, CNAM, or reinsurer login.
- Full Arabic or right-to-left interface.

Some buttons intentionally simulate future behavior with notification messages.

---

## 14. Production Readiness Items

Before production, the following would need to be clarified or built:

- Legal validation of the 15-day auto-approval rule.
- FTUSA and insurer data governance agreements.
- INPDP privacy and data-processing compliance.
- Real authentication, authorization, and audit trail.
- Backend APIs and database.
- File upload, secure document storage, and PDF preview.
- Real CSV validation and error handling.
- Real email ingestion pipeline.
- ALFA integration design and contract.
- CGA export or reporting rules, if required.
- Arabic language and right-to-left support.
- Operational hosting, backup, monitoring, and support.
- Pilot rollout with selected insurance companies.

---

## 15. Short Glossary

| Term | Meaning |
|---|---|
| FTUSA | Federation administrator and owner of the federation-level platform |
| Tenant | Separate company workspace and data area |
| Claim | Request to reimburse a medical expense after care |
| Prior authorization | Request to approve care before it happens |
| Member | Insured person |
| Plan tier | Insurance coverage plan |
| Coverage rule | Reimbursement percentage and limits for a medical act |
| Group contract | Employer insurance contract covering employees |
| Provider | Clinic, doctor, lab, nurse, dentist, physiotherapist, or other medical provider |
| SLA | Target processing time |
| Auto-approval | Automatic approval after the configured legal deadline |
| Opt-in | Explicit company choice to participate in analytics or fraud sharing |
| ALFA | Planned fraud-fighting integration, simulated in this demo |
| CGA | Regulatory reporting context; not implemented as an official report in this demo |

---

## 16. One-Sentence Summary

This demo shows a complete FTUSA-owned insurance operations platform where the federation can supervise market activity and communications, while each insurer manages its own claims, authorizations, members, group contracts, providers, fraud signals, analytics, and settings inside a separated company workspace.
