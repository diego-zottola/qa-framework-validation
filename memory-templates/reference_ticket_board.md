---
name: reference-ticket-board
description: Where {{APP_NAME}}'s tickets are tracked ({{TICKET_TOOL}})
metadata:
  type: reference
---

Ticket tracker: **{{TICKET_TOOL}}** — {{board/project key, board URL, or cloud ID, as applicable}}.

**Why:** `/automate-ticket` and `/manual-test` need this to know where to fetch ticket details from.

**How to apply:** if `{{TICKET_TOOL}}` is "none", this file documents that ACs are pasted manually instead of
fetched — update it the moment a real tracker gets connected, and rename this file to match
(`reference_jira_board.md`, `reference_linear_board.md`, ...).
