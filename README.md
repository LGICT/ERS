# ERS – Enterprise Requisition System

A working version of the ERS built from the screenshots in this folder.

## How to open it

Double-click **`Open ERS.html`** in this folder, or open `app/index.html`. It runs in your web browser (Chrome or Edge).
You don't need to install anything, and it works without internet.

## Try it out (demo users)

The app starts with sample data. Use the **profile menu (top right) → Switch user** to act as different people:

| User | Role | What they can do |
|---|---|---|
| Ralphson Guya | Administrator | Everything, including Settings and approving any department |
| Bon Cayanan | Approver (ICT) | Approves requests from the ICT Department |
| Maria Santos | Approver (HR) | Approves requests from HR |
| Juan Dela Vega | Approver (Finance) | Approves requests from Finance |
| Noe Dela Cruz / Liza Ramos | Supply Chain | Reviews requests and releases items |
| John Dela Cruz, Jane Reyes, Carlo Mendoza | Requestor | Creates requests only |

### The approval flow

1. A user creates a request (**New Request**) and submits it, or saves it as a draft.
2. **Supervisor approval**: an Approver from the same department (or an Administrator) approves, rejects, or sends it back with **Request Changes**.
3. **Supply Chain review**: Supply Chain checks stock and completes the review.
4. **For release**: Supply Chain releases the items. Stock goes down automatically.

At each step the right people get a notification, the budget figures update, and the action is written to the **Audit Trail**.

## What works

- Dashboard, New Request (catalog search, quick add, custom items, budget impact), My Requests (filter, history, cancel, duplicate, print)
- Approvals (single or bulk, remarks, request changes, over-budget and low-stock warnings)
- Items Catalog with CSV export, Budget Status, Reports (7 report tabs, all exportable to Excel/CSV)
- Settings: company info, users and roles, departments and cost centers, workflow templates, item management (add, edit, stock adjustment, CSV import), budget configuration, allocation, thresholds, fiscal periods and summary, notifications, system preferences (including dark theme), audit trail, backup and restore

## Important limitations of this version

- **Data is saved only in the browser on this computer.** Other people won't see it. Clearing the browser's data erases it.
  Use **Settings → Backup & Security → Download Backup** regularly.
- **There are no real logins.** Anyone using the browser can switch users. This is fine for demos and testing, but not for real use.
- **Emails are not sent.** Notifications appear inside the app only.
- **Every request uses the Standard workflow** (Supervisor → Supply Chain → Release). The other workflow templates are saved for reference but don't route requests yet.
- **Attachments** (file uploads on requests) aren't built yet.

## Making it company-wide (next step)

To let all employees use one shared system, ERS needs a central server and database, company sign-in (for example Microsoft 365), and email notifications.
The screens and business rules in this version carry over directly.
`app/js/store.js` is the only file that needs to change: it would talk to the server instead of the browser's storage.
Your ICT team or a developer can host it on a company server or a cloud service.

## Files

- `app/index.html`: the app page
- `app/css/styles.css`: the look and feel
- `app/js/store.js`: data, sample data and business rules (approvals, budgets, notifications, audit)
- `app/js/ui.js`: shared building blocks (tables, charts, dialogs)
- `app/js/pages/`: one file per screen
