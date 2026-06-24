---
name: sirh-ui-review
description: Use before finalizing Angular frontend UI changes in the SIRH app. Checks visual consistency, responsive behavior, accessibility basics, loading states, empty states, and accidental business-logic changes.
---

# SIRH UI Review Skill

## Checklist

Visual consistency:

- Page matches enterprise admin-dashboard style.
- Sidebar and breadcrumbs remain consistent.
- Page header has title, subtitle, and actions.
- Cards, tables, buttons, and filters use consistent spacing.
- No random colors or one-off styles.

Behavior:

- Existing routes still work.
- Existing API calls are preserved.
- Existing permissions and actions are preserved.
- Search, filter, pagination, and row actions still work.
- Loading, empty, and error states are handled.

Accessibility basics:

- Icon-only buttons have accessible labels.
- Inputs have labels or accessible names.
- Focus states are visible.
- Text contrast is readable.

Responsive basics:

- Page does not overflow badly.
- Tables/cards remain usable.
- Sidebar/main layout does not collapse incorrectly.

Validation:

- Run npm run build.
- Run tests only if configured and reasonable.
- Report exact failures if validation fails.
