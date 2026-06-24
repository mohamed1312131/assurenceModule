---
name: sirh-enterprise-admin-ui
description: Use when improving Angular SIRH, HR, insurance, ERP, admin-dashboard, internal-tool, module pages, sidebar layout, cards, filters, breadcrumbs, page headers, and rounded dashboard screens. Do not use for marketing landing pages.
---

# SIRH Enterprise Admin UI Skill

## Target style

The UI should look like a serious enterprise admin platform.

The goal is not to copy colors. The goal is to copy the theme structure:

- Dark left sidebar with grouped navigation.
- Active sidebar item with clear selected state.
- Light main workspace.
- Large rounded application shell.
- Top breadcrumb area.
- Page title with short subtitle.
- Right-aligned action buttons.
- Soft metric cards.
- Compact filters and search fields.
- Data tables with sorting, pagination, row actions, and empty states.
- Optional card/list switch for employee-style records.
- Minimal shadows.
- Consistent spacing.
- No flashy gradients.
- No landing-page style.

## Angular rules

- UI source files are inside `src/`.
- Prefer editing existing components before creating new ones.
- Preserve Angular services, routes, guards, API calls, and business logic.
- Avoid adding new dependencies unless approved.
- Reuse existing CSS, SCSS, Tailwind, Angular Material, PrimeNG, or custom components already present in the project.

## Workflow

1. Inspect the existing Angular page/component.
2. Identify the existing styling system.
3. Check `docs/design/screenshots/` if available.
4. Improve layout, spacing, alignment, and component consistency.
5. Preserve all behavior.
6. Check responsive behavior.
7. Run build/typecheck if available.
8. Summarize changed files and UI changes.

The current login/access page UI is not acceptable for a professional FTUSA / insurance-company demo.

Business context:
- This is a demo solution for FTUSA and an insurance company.
- The login page should only provide 2 access choices:
  1. Login as FTUSA
  2. Login as STAR Assurances
- Remove COMAR from the main login selector.
- This is a demo gateway, not a marketing landing page and not a dashboard page.

Target UX:
- Professional, clean, modern 2026 enterprise SaaS style.
- Minimal access gateway.
- No heavy left marketing panel.
- No dashboard breadcrumb like “Modules > Connexion” before login.
- Clear title: “Choisir un espace de connexion”
- Subtitle explaining this is a demo environment.
- Two polished role cards or two large login buttons:
  - Espace FTUSA — Régulateur
  - Espace STAR Assurances — Assureur
- Each card should have a short description and one clear action button.
- Add a small “Mode démonstration” badge.
- Add a small footer: “Environnement de démonstration — données fictives.”
- Keep the existing color palette.
- Do not add a new UI library.
- Do not change routes, API contracts, authentication logic, or business logic.
- Reuse existing Angular components/styles where possible.
- Make it responsive.

First inspect the login component files and give me the implementation plan before editing.
After editing, use $sirh-ui-review and run npm run build.

## Auth / login gateway rules

For login or demo access screens:

- Treat the page as an access gateway, not a dashboard page.
- Do not show dashboard breadcrumbs before authentication.
- Do not show full module navigation before authentication.
- Keep the page focused on choosing the correct access profile.
- For this project, the demo login must show only:
  - FTUSA access
  - STAR Assurances access
- Do not show COMAR unless explicitly requested.
- Avoid marketing-heavy copy.
- Use short, professional wording.
- Use clear role labels:
  - FTUSA = Régulateur
  - STAR Assurances = Assureur
- Use one action per role.
- Add a small demo-mode indicator.
- Add a small fictive-data disclaimer.

## FTUSA company management pages

For FTUSA company/tenant management screens:

- Treat the screen as a regulated tenant-management console.
- Do not design it as a simple CRUD list.
- Always show company identity, status, admin/access state, sharing participation, onboarding state, and last activity when data exists.
- Prefer a toolbar with search, filters, view toggle, and table utilities.
- Support table view for scanning and card view for operational review.
- Keep actions clear: manage, suspend/reactivate, reset access.
- Do not invent business data. Use existing fields or derived values only.