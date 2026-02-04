## Decision: Mobile App vs Web App

### MVP Approach

**Web-first, mobile-responsive web app**
**No native iOS / Android app during the pilot**

---

## Why This Is the Right Call (Given the Problem Brief)

### 1. Safety & Trust Come First

Native mobile apps introduce additional risk surfaces:

* App store accounts and identities
* Push notifications (which can surface sensitive context on locked screens)
* Device permissions and OS-level data retention
* Forced update cycles

For a project explicitly designed to **minimize exposure**, a responsive web app is safer and easier to reason about.

---

### 2. Web Covers the Actual Use Cases

For the MVP, users need to:

* Register a group
* Submit a funding request
* Review status
* Approve or route funds

All of these:

* Are **low-frequency**
* Are **not time-critical to the minute**
* Are already done today via email, Google Forms, or spreadsheets

A mobile-friendly web UI already improves on the status quo.

---

### 3. Operational Reality of Mutual Aid Groups

Many organizers:

* Share devices
* Rotate volunteers
* Use laptops or shared accounts for financial coordination
* Prefer links they can open without installing software

A web app:

* Works across shared machines
* Requires no app install
* Avoids app-store friction and suspicion

This matters more than “mobile convenience.”

---

### 4. Scope Control (Critical for Trust)

A native app signals:

* Permanence
* Scale
* Institutional intent

That is **not** what Relay should signal during a pilot.

A quiet web tool aligns with:

* Invite-only usage
* Low-profile operation
* Easy shutdown if needed

---

## What “Mobile-Ready” *Does* Mean for MVP

Even without a native app, the MVP **must**:

* Be fully usable on phones
* Have large tap targets
* Avoid dense tables
* Support short sessions
* Work well in low-bandwidth conditions

Think:

> “Opens cleanly from a Signal or email link and just works.”

This is a **responsive web app**, not “desktop-only.”

---

## When a Mobile App *Would* Make Sense (Post-MVP)

A native mobile app becomes justified **only if** one or more of these are true after the pilot:

1. **High-frequency usage**

   * Groups are submitting or updating requests daily
2. **Time-sensitive approvals**

   * Push notifications materially reduce delays
3. **Offline or low-connectivity needs**
4. **Strong organizer preference**

   * Explicit request from pilot participants
5. **Security benefits**

   * e.g., device-bound keys or secure enclaves become necessary

Until then, a mobile app is cost without clear benefit.

---

## Explicit Decision Statement (You Can Reuse This)

> For the MVP and pilot phase, Relay will be delivered as a mobile-responsive web application. A native mobile app is intentionally out of scope until the pilot demonstrates a clear operational or safety benefit that cannot be met by the web app.

This is a **good, conservative decision**.

---

## Practical Build Guidance (So This Stays True)

* Single-page web app
* Strong mobile layout testing
* No reliance on hover, right-click, or keyboard shortcuts
* No assumption of large screens
* No push notifications
* Email / link-based access only

---

## Bottom Line

* **Web app for MVP:** yes
* **Native mobile app:** post-MVP, conditional
* **Reason:** safety, trust, scope discipline, and real user behavior

This choice reinforces that Relay is **infrastructure**, not a product chasing engagement.