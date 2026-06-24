---
name: sirh-data-table-filter-ux
description: Use when improving Angular admin tables, employee lists, availability requests, advanced filters, sorting, pagination, table actions, empty states, card/list views, and customizable columns.
---

# SIRH Data Table and Filter UX Skill

## Goal

Improve data-heavy admin screens without breaking behavior.

Use this for:

- Employees table.
- Availability requests.
- Departments.
- Timesheets.
- Insurance dashboard tables.
- Search/filter/pagination screens.

## UX rules

Search:

- Search should be visible.
- Placeholder should explain what can be searched.
- Search should not hide advanced filters.

Advanced filters:

- Use a collapsible advanced filter panel when there are many filters.
- Keep labels clear.
- Align filters in a grid.
- Keep Clear and Apply buttons grouped.

Tables:

- Headers must be readable.
- Sorting icons should be consistent.
- Long values like emails should truncate cleanly.
- Row actions stay on the right.
- Empty state should look intentional.

Pagination:

- Show rows per page.
- Show current page and total count.
- Disable impossible navigation buttons.

Card/list views:

- Card view is useful for employees and people records.
- Table view is useful for scanning many records.
- Keep the toggle visible and understandable.

## Workflow

1. Locate the data source and state management.
2. Preserve API calls and query parameters.
3. Improve layout and component structure.
4. Keep filters and pagination functional.
5. Check loading, empty, and error states.
6. Run validation commands.
7. Summarize changed files.
