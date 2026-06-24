# Codex project instructions

This is an Angular SIRH / insurance dashboard project.

## UI/UX rules

When modifying frontend UI, use these repo skills:

- Use $sirh-enterprise-admin-ui for dashboard layout, sidebar, page headers, cards, breadcrumbs, buttons, and enterprise admin styling.
- Use $sirh-data-table-filter-ux for tables, filters, search, pagination, empty states, list/card views, and row actions.
- Use $sirh-ui-review before finalizing UI changes.

Do not change the color palette unless explicitly requested.
Do not introduce a new UI library without approval.
Do not rewrite business logic while improving UI.
Do not break existing routes, API contracts, permissions, forms, or state management.
Prefer existing Angular components, services, and styles before creating new ones.

After frontend changes, run the available validation commands:
- npm run build
- npm test, only if tests are configured and not too slow
