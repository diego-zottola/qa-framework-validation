---
name: project-next-task
description: Queue of pending tickets/tasks for {{APP_NAME}} test automation
metadata:
  type: project
---

No tickets in the queue yet — this file is seeded empty at bootstrap.

**Why:** `/automate-ticket` and `/save-session-context` both read and update this file to track what's next.

**How to apply:** add one entry per ticket as it's discussed:
`{{TICKET_ID}} — [started/done/blocked/parked] — one-line description`.
