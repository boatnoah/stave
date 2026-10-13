# Product workflow

Each local workspace owns one project, its instantiated team, tickets, run attempts, and activity. The first product board supports a clearly labelled simulation. Simulation never edits repository files.

Tickets move through Todo, Implementation, Review, QA, and Done. Implementation routes to an enabled engineer, review to an enabled tech lead, and QA to an enabled QA agent. Each attempt retains the actual agent ID. Only successful QA marks a ticket Done. Failed, canceled, interrupted, capacity-limited, and user-blocked attempts keep the current stage and can be resumed.

Tickets use sequential `STV-1`, `STV-2`, and later keys within a project. New tickets default to type Task and priority Medium. Types are Task, Bug, Feature, Chore, and Research; priorities are Low, Medium, High, and Urgent. Points are optional integers from 1 to 100. Epic and labels are optional; each ticket has up to eight unique labels.

One pipeline runs at a time. A second start is rejected until the first has settled. Cancellation aborts the active runner and waits for it to stop before releasing the claim. A late successful response after cancellation cannot advance the ticket. Explicit application quit stops active work. Closing the window on macOS leaves the application running.

The renderer subscribes before fetching its initial snapshot and ignores older revisions. The avatar lab remains available through the header.

Verification: the project-local Electron driver creates a project and ticket through visible forms, cancels one run, completes another, and checks all three role handoffs and the Done column. Unit tests cover duplicate starts, late completion, capacity recovery, failed review, and snapshot isolation.
