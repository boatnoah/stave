# Stave domain model

Stave starts each project with a versioned team template. The first template creates Maya as tech lead, Alex as engineer, and Sam as QA. These are project-owned agent records, so later projects can select a different template or edit the resulting team without changing workflow code.

The MVP uses these terms:

- A project points at one repository and owns its team.
- A goal describes an outcome for the project.
- A ticket is the smallest schedulable delivery unit.
- A run is one agent attempt on one ticket.

Ticket workflow and run execution are separate. A ticket can be in Todo, Implementation, Review, QA, Blocked, or Done. A run can pause for retry, capacity, or user input without inventing a new ticket stage. This separation lets Stave recover from provider limits and application restarts without losing the delivery state.

The renderer may read domain snapshots. Electron, SQLite, Git, and model-provider details must stay outside the domain package.
