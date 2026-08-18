# Smart Warehouse Ops

Build a complete, polished, hackathon-winning web application called SmartFulfill — Smart Warehouse Operations & Order Fulfillment System.

Act as a senior full-stack engineer, UI/UX designer, product architect, data-visualization specialist, and hackathon strategist.

The application must feel like a real-world warehouse management product, NOT a basic CRUD project or collection of disconnected dashboards.

The core principle is:

Visibility → Decision → Action → Resolution → Analytics

The system must manage:

Order Created → Priority Determined → Inventory Checked → Allocation → Picking → Packing → Quality Check → Dispatch → Inventory Updated

1. IMPORTANT DEVELOPMENT RULES

Build the complete application as one connected system.

ABSOLUTE REQUIREMENTS

Every page must be functional.

Every button must perform a real action.

Every button must navigate to the correct page when navigation is required.

No dead buttons.

No fake links.

No placeholder pages.

No "Coming Soon" sections.

No broken routes.

No duplicated pages.

No inconsistent data between pages.

State changes must propagate throughout the application.

Use realistic mock warehouse data.

The entire demo must work without external APIs.

Do not add unnecessary AI APIs.

Implement transparent rule-based decision logic.

Preserve application state during the session.

Use realistic loading, success, error, empty, and confirmation states.

2. ROLE-BASED LOGIN SYSTEM

Create separate login experiences for different warehouse users.

Create these roles:

Admin

Route:

/login/admin

Admin can access:

Dashboard

Orders

Inventory

Allocation

Picking

Packing

Quality Check

Dispatch

Exceptions

Decision Center

Analytics

User/warehouse settings

Warehouse Worker

Route:

/login/worker

Worker can access:

Worker Dashboard

Assigned Picking Tasks

Packing

Quality Check

Exceptions

Dispatch Tasks

Workers should NOT see administrative controls.

Customer

Route:

/login/customer

Customer can access:

Customer Dashboard

My Orders

Order Tracking

Order Details

Notifications

Profile

Customer should NOT see internal warehouse inventory, allocation, worker information, or operational analytics.

Login Requirements

Each login page should have:

Unique role-specific design

Email/username

Password

Show/hide password

Remember me

Login button

Forgot password UI

Demo credentials section

Role description

Proper validation

Error messages

Successful redirect

Use mock authentication for the hackathon.

After login, redirect users to the correct dashboard based on their role.

Do not expose unauthorized pages through navigation.

3. UNIQUE VISUAL IDENTITY

Create a distinctive visual design specifically for SmartFulfill.

Do NOT use a generic template.

Use:

Professional warehouse-control-room aesthetic

Clean typography

Strong hierarchy

Modern cards

Distinctive icons

Premium spacing

Subtle animations

Responsive layout

Consistent design system

Use a carefully designed color system:

Primary brand color for actions

Separate colors for warehouse statuses

Critical red

Warning amber

Success green

Information blue

Neutral slate/gray

Do not randomly color every component.

Create a consistent visual language across all pages.

Use an appropriate modern font pairing and apply it consistently.

4. ORDERED APPLICATION FLOW

The pages must follow the real warehouse workflow.

Navigation order:

Login

Dashboard

Orders

Inventory

Allocation

Picking

Packing

Quality Check

Dispatch

Exceptions

Decision Center

Analytics

The UI should visually communicate this workflow.

Create a workflow progress component:

Created → Prioritized → Allocated → Picking → Packing → QC → Dispatch → Completed

Each order must clearly show its current stage.

5. DATA-VISUALIZATION-FIRST DASHBOARD

The Dashboard MUST be heavily focused on data visualization.

Do NOT create a dashboard consisting mainly of KPI cards.

Use KPI cards only as a summary.

Create a professional operational command center with:

KPI SUMMARY

Total Orders

Critical Orders

Orders in Progress

Ready for Dispatch

Low Stock SKUs

Out of Stock SKUs

Fulfillment Rate

Active Exceptions

DATA VISUALIZATIONS

Create interactive charts using Recharts.

Include:

Order Status Distribution

Created

Allocated

Picking

Packing

QC

Dispatch

Completed

Orders by Priority

Critical

High

Normal

Low

Fulfillment Trend

Daily/weekly order completion trend

Inventory Health

Healthy

Low Stock

Out of Stock

Reserved

Damaged

Processing Time by Stage

Allocation

Picking

Packing

QC

Dispatch

Exceptions by Category

Stock shortage

Damaged item

Missing item

Wrong SKU

Picking delay

Packing delay

QC failure

Dispatch delay

Warehouse Bottleneck Visualization

Clearly identify the stage currently causing the largest operational delay.

Example:

Packing Bottleneck

Queue: 18 orders
Average processing: 8.4 min
Target: 5 min
Delayed orders: 7

Recommendation:

Open an additional packing station.

Charts must have:

Tooltips

Legends where useful

Proper labels

Responsive sizing

Filters/time range controls where appropriate

The dashboard should look like an actual warehouse operations control room.

6. ORDER MANAGEMENT

Create /orders.

Show:

Order ID

Customer

Items

Quantity

Order value

Priority

SLA deadline

Current stage

Risk

Actions

Add:

Search

Filters

Sorting

Status filtering

Priority filtering

SLA risk filtering

Clicking an order must open a complete Order Details page/drawer.

Order details:

Customer

Items

SKU

Quantity

Inventory availability

Priority score

Allocation

Current stage

Timeline

Exceptions

Decision history

Create a functional:

Create Order

form.

After order creation:

Order → Priority Calculation → Inventory Check → Allocation Recommendation

7. SMART PRIORITY DECISION ENGINE

Implement transparent rule-based priority scoring.

Use:

Priority Score =

Urgency: 40%

SLA Risk: 30%

Customer Priority: 20%

Order Value: 10%

Classification:

80–100 = Critical

60–79 = High

40–59 = Normal

Below 40 = Low

Show WHY the priority was assigned.

Example:

Critical — Score 91

Reasons:

SLA deadline approaching

High customer priority

High order value

Never hide the decision reasoning.

8. INVENTORY MANAGEMENT

Create /inventory.

Display:

SKU

Product

Category

Zone

Bin

Available

Reserved

Damaged

Reorder Level

Status

Statuses:

Healthy

Low Stock

Out of Stock

Reserved

Damaged

Add:

Search

Filters

Sorting

Inventory detail view

Stock movement history

Automatically detect:

Available Stock <= Reorder Level

and generate a replenishment recommendation.

9. SMART INVENTORY ALLOCATION

Create /allocation.

This is one of the MOST IMPORTANT hackathon features.

Implement decision-making logic.

Example:

Order A:

Required = 10
Available = 7
Priority = Critical

Order B:

Required = 5
Priority = Normal

The system should recommend:

Allocate 7 units to Order A because it has higher priority.

Then:

Reserve remaining shortage

Put lower-priority Order B on stock hold

Create replenishment task

Create exception

Explain the decision

Display:

Required

Available

Allocated

Shortage

Affected orders

Priority

Reason

Buttons:

Accept Decision

Modify Allocation

Reject

When accepted, update:

Inventory

Reservations

Order status

Exceptions

Dashboard

Activity log

Notifications

10. PICKING

Create /picking.

Display:

Pick ID

Order

Picker

SKU

Quantity

Zone

Bin

Priority

Status

Estimated time

Create warehouse zone visualization:

Zone A
A-01 | A-02 | A-03 | A-04

Zone B
B-01 | B-02 | B-03 | B-04

Zone C
C-01 | C-02 | C-03 | C-04

Create simplified pick-route optimization.

Show:

Original Route

A-01 → C-02 → A-05 → B-03

Optimized Route

A-01 → A-05 → B-03 → C-02

Display estimated distance/time saved.

Functional buttons:

Start Picking

Complete Pick

Report Missing Item

Report Damaged Item

11. PACKING

Create /packing.

This must be a dedicated warehouse packing workstation.

Display:

Order

Items

Quantity

Picker

Package type

Weight

Status

Create interactive checklist:

Correct Order

Correct SKU

Correct Quantity

Product Condition

Packaging

Package Sealed

Shipping Label

Only allow:

Complete Packing

when required checks are completed.

Packing exceptions:

Missing Item

Wrong SKU

Quantity Mismatch

Damaged Item

Packaging Issue

When an exception occurs:

Exception → Recommended Decision → Resolution

Example:

"Damaged item detected."

Recommendation:

"Replacement available at Bin B-12."

Actions:

Replace Item

Hold Order

Escalate

12. QUALITY CHECK

Create /quality-check.

QC checklist:

SKU Match

Quantity Match

Product Condition

Packaging

Shipping Label

Actions:

Approve

Reject

Send Back to Packing

If rejected:

Require reason

Create exception

Return order to Packing

If approved:

Move to Dispatch

13. DISPATCH

Create /dispatch.

Sections:

Ready

At Risk

Delayed

Dispatched

Display:

Order ID

Customer

Package

Carrier

Tracking ID

Deadline

Risk

Status

Risk:

🟢 On Time
🟡 At Risk
🔴 Delayed

Actions:

Assign Carrier

Prioritize Dispatch

Mark Dispatched

When dispatched:

Complete order

Update inventory

Update dashboard

Update analytics

Add activity log

14. EXCEPTION MANAGEMENT

Create /exceptions.

Exception types:

Stock Shortage

Damaged Item

Missing Item

Wrong SKU

Quantity Mismatch

Picking Delay

Packing Delay

QC Failure

Dispatch Delay

Display:

Exception ID

Type

Order

Severity

Detected

Status

Recommendation

Owner

Statuses:

Open

Investigating

Action Required

Resolved

Escalated

Each exception must show:

Problem

↓

Recommended Decision

↓

Resolution

15. DECISION CENTER

Create /decision-center.

This should be the signature feature.

Show all decisions requiring operator attention.

Examples:

Critical Stock Shortage

Order #1042 requires 10 units.

Available: 7.

Recommendation:

"Allocate 7 units to the critical order and hold lower-priority orders."

Buttons:

Accept

Modify

Reject

Damaged Product

Recommendation:

"Replace damaged unit using Bin B-12 and return order to Packing."

Buttons:

Resolve

Hold

Escalate

Dispatch Risk

Recommendation:

"Move order to priority dispatch queue."

Button:

Prioritize

Every accepted decision must actually change system state.

Add decision history:

Decision

Reason

Operator

Timestamp

Result

16. ANALYTICS

Create /analytics.

This page should provide deeper warehouse intelligence.

Visualizations:

Orders over time

Fulfillment rate

Inventory health

Stock movement

Picking performance

Packing performance

QC failure rate

Dispatch performance

Exceptions

Average processing time

Create filters:

Today

7 Days

30 Days

Create a Bottleneck Analysis section.

Automatically identify the worst-performing stage.

Example:

Packing

Queue: 18
Average time: 8.4 min
Target: 5 min

Recommendation:

"Open an additional packing station."

17. CUSTOMER PORTAL

Customer login must redirect to /customer/dashboard.

Customer can see:

My Orders

Order Status

Tracking

Order Details

Estimated Delivery

Notifications

Customer should see a clean simplified interface.

Do NOT expose internal warehouse information.

Order tracking should visually show:

Order Placed → Allocated → Picking → Packed → QC → Dispatched → Delivered

18. WORKER PORTAL

Worker login redirects to /worker/dashboard.

Show:

Assigned Tasks

Picking Queue

Packing Queue

QC Tasks

Exceptions

Priority Tasks

Workers should see only relevant operational information.

Allow workers to update task status.

19. ADMIN PORTAL

Admin gets complete warehouse visibility.

Admin dashboard includes:

Full analytics

Inventory

Orders

Workers

Exceptions

Decision Center

Operational performance

20. GLOBAL SEARCH

Create working global search.

Search:

Order ID

SKU

Product

Customer

Exception ID

Results must navigate to the correct page.

21. NOTIFICATIONS

Create working notification center.

Generate notifications for:

Critical order

Low stock

Stock shortage

Damaged item

Missing item

Picking delay

Packing delay

QC failure

Dispatch risk

Allow:

Mark as Read

Clicking a notification must redirect to the relevant page.

22. ACTIVITY TIMELINE

Track:

Order created

Priority assigned

Inventory allocated

Picking started

Picking completed

Packing completed

Exception created

Decision accepted

QC approved

Dispatch completed

Display timestamp + event description.

23. REALISTIC MOCK DATA

Seed realistic data.

At minimum:

20 products

15 orders

Multiple customers

Multiple warehouse zones

Multiple workers

Low-stock products

Out-of-stock products

Damaged inventory

Stock shortages

Picking tasks

Packing tasks

QC failures

Dispatch delays

Multiple exceptions

Use realistic product names such as:

Wireless Keyboard

USB-C Charger

Bluetooth Earbuds

Mechanical Keyboard

Smart Watch

Office Backpack

Wireless Mouse

Laptop Stand

Power Bank

HDMI Cable

Make the data interconnected.

24. FULL DEMO SCENARIO

Create a complete demo order:

Order #1042

Priority: Critical

Required: 10 units

Available: 7 units

System detects shortage.

Decision Center recommends:

"Allocate 7 units to Order #1042 because of its critical priority. Hold Order #1051 and create replenishment task."

Then allow the judge to execute:

Accept allocation

Start picking

Complete picking

Move to Packing

Detect damaged item

Resolve replacement

Complete packing

Perform QC

Approve QC

Detect dispatch risk

Prioritize dispatch

Dispatch order

Update inventory

Update analytics

Show completed fulfillment

The complete scenario must work without page refresh.

25. BUTTON AND ROUTING RULE

THIS IS CRITICAL.

Every button must have a purpose.

Examples:

View Order → Order Details

View Inventory → Inventory

Allocate → Allocation

Start Picking → Picking

Pack Order → Packing

QC → Quality Check

Dispatch → Dispatch

Resolve Exception → Exception Details

View Decision → Decision Center

View Analytics → Analytics

Track Order → Customer Tracking

View Notification → Relevant Page

Do not create buttons that do nothing.

Every route must exist.

26. PAGE CONSISTENCY

Every page must use:

Same sidebar

Same header system

Same typography

Same spacing

Same status system

Same buttons

Same cards

Same table style

Same responsive behavior

However, each major module should have its own meaningful visual identity through layout, icons, charts, and contextual components.

27. RESPONSIVE DESIGN

The application must work on:

Desktop

Laptop

Tablet

Mobile

Tables should become responsive cards or horizontally scrollable tables where appropriate.

Navigation should collapse into a mobile menu.

Do not allow charts or tables to overflow the screen.

28. PERFORMANCE AND CODE QUALITY

Use reusable components.

Create reusable:

Cards

Tables

Status badges

Modals

Forms

Charts

Workflow indicators

Notification components

Decision cards

Avoid duplicated code.

Keep the architecture clean and maintainable.

29. FINAL TESTING

Before considering the project complete, test:

All login pages

Role permissions

All routes

All navigation

Every button

Forms

Search

Filters

Order creation

Priority scoring

Allocation

Inventory updates

Picking

Packing

Exceptions

QC

Dispatch

Notifications

Decision Center

Analytics

Activity timeline

Responsive layouts

Fix all:

Broken buttons

Broken routes

Console errors

TypeScript errors

Incorrect state updates

Inconsistent data

Overflow issues

Missing loading states

Missing error states

30. FINAL HACKATHON GOAL

The final application must demonstrate:

VISIBILITY

The warehouse manager can see everything happening.

DECISION-MAKING

The system identifies problems and recommends what should happen.

EXECUTION

Operators can accept those decisions and execute the workflow.

EXCEPTION HANDLING

The system handles shortages, damages, missing products, delays, and QC failures.

ANALYTICS

The system identifies bottlenecks and operational trends.

The final experience should feel like:

"A real warehouse command center that helps teams make better operational decisions."

NOT:

"A website containing several CRUD pages."

Prioritize:

Functionality > Workflow > Decision Logic > Data Visualization > UX > Visual Polish

Build the entire application as one cohesive, connected, hackathon-ready product.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://swift-resolve-ware.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/75ffedc8-dbc5-4daf-9b2b-17e64d7753ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
