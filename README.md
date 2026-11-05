# EBTCamp Management System

A management system for EBTCamp designed to handle:

- Order Management
- Inventory Management
- Project Management
- Product Tracking
- Internal Operations

## Overview

This project is built to simplify and centralize the management workflow inside EBTCamp.  
The system helps manage products, orders, inventory status, and project-related operations in one place.

## Features

- Manage customer orders
- Track inventory and stock quantity
- Manage projects and tasks
- Product management
- Dashboard and statistics
- File and image storage
- Authentication and authorization

## Daily reports

The Daily Report page stores each task entry in `TaskDailyReports` and links it
to a `Reports` record for the report date and signed-in reporter. Configure the
PocketBase collections with these fields:

- `TaskDailyReports`: `title` (text), `stage` (text), `work_status` (select:
  `Not started`, `Processing`, `Done`), `worker` (text containing the selected
  member names as a JSON array), `detail` (text, what was handled that day),
  `evidence_image` (image/file; allow multiple files if multiple evidence
  images are needed).
- `Issues`: `type` (text or select: `Electric`, `Mechanical`,
  `Missing Material`, `Program`, `Robot`) is required when creating an issue
  from Daily Report. `handler` (relation to `users`, or text holding the user
  id) and `deadline` (date) are set once from the Workflow issue table; only
  users whose `position` matches the issue type can be chosen, and both fields
  are locked after assignment.
- `users`: `position` (multiple select: `Part Leader`, `Senior Engineer`,
  `Purchasing`, `Technician`, `Unit Leader`, `Engineer`, `Mechanical`,
  `Electric`, `Program`, `Robot`), `avatar` (image) and `background_image`
  (image, the cover photo on the profile page). Users edit their own photos,
  position and password on `user.html`; the collection's update rule must
  allow a user to update their own record.

- `Inventory_Items`: `auto_increment_id` (number) is the last QR label number
  issued for the material. Printing N labels for code `AAAA` creates
  `AAAA-<last+1>` … `AAAA-<last+N>` and saves `auto_increment_id = last + N`
  together with `stock = stock + N` (printing labels is the stock-in step).
  When scanning, the text before the last `-<number>` is the material code
  used to add or remove stock.
- The Nhập kho page can also create materials in bulk from an `.xlsx` file
  (read with ExcelJS). The sheet needs a header row with `Tên sản phẩm`
  (→ `name`), `QCode/XCode` (→ `code`) and optionally `Mô tả`
  (→ `description`). Only codes not yet in `Inventory_Items` are created, with
  `stock = 0` and `auto_increment_id = 0`; existing codes are skipped.

On the Notification page an issue is shown only to users whose `position`
matches its `type`: `Electric`, `Mechanical`, `Program` and `Robot` go to the
role with the same name, and `Missing Material` goes to `Purchasing`.
- `Reports`: `task_daily_reports` (multiple relation to `TaskDailyReports`),
  `report_date` (date), and `reporter` (text).

`TaskDailyReports` entries are matched to project tasks by their `title` and
`stage`. An optional `task` relation to `Tasks` can be added if task names are
not unique. Saving a task as `Not started`, `Processing`, or `Done` updates its
`Tasks.progress` to `0`, `0.5`, or `1`, respectively. Workflow Gantt bars show
in-progress tasks with an animated amber highlight. One `Reports` record is
created per reporter and date, and its `task_daily_reports` relation contains
all task reports saved for that report.

Workers are selected from the system users in Daily Report and may include
multiple members per task. The Workflow task creation popup does not assign
handlers; workers are selected when preparing a daily report.

## Script structure

Each page in `Page/` has its own folder in `Script/` with the same layout
(see `Script/project/` for the reference implementation):

| File          | Responsibility                                                   |
|---------------|------------------------------------------------------------------|
| `main.js`     | Entry point loaded by the page: auth check, initial load, wiring |
| `service.js`  | API calls and data processing; never touches the DOM             |
| `events.js`   | Event listeners; coordinates `service`, `state` and `ui`         |
| `ui.js`       | Rendering and reading the DOM only; no API calls                 |
| `state.js`    | Page state                                                       |
| `messages.js` | User-facing message strings                                      |

Shared code lives in `Script/services/generic.api.js` (PocketBase requests),
`Script/utils/` and `Script/config.js`.

The warehouse ("Kho vật tư" in the sidebar) is split into three pages that
share `Script/services/inventory.api.js` (material lookup, QR code parsing,
stock changes, label numbering) and `Script/utils/scan-input.js` (handheld
scanner detection):

| Page                | Script folder           | Purpose                                         |
|---------------------|-------------------------|-------------------------------------------------|
| `stock-import.html` | `Script/stock-import/`  | Print QR labels; printing N labels adds N stock |
| `stock-export.html` | `Script/stock-export/`  | Scan into a list, edit quantities, save (−)     |
| `inventory.html`    | `Script/inventory/`     | Stock list: filter, scan-to-filter, delete      |

## Technologies

### Backend
- PocketBase

### Frontend
- HTML
- CSS
- JavaScript

## Project Structure

```bash
project-root/
│
├── pb_hooks/          # PocketBase hooks
├── pb_migrations/     # Database migrations
├── public/            # Static files
├── src/               # Frontend source
├── README.md
└── .gitignore
