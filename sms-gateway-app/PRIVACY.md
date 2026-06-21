# ShuleCloud SMS Gateway — Privacy Policy

_Last updated: 2026-06-21_

ShuleCloud SMS ("the app") is a companion app for schools using the ShuleCloud
School Management System. It turns an Android phone into an SMS gateway so a
school can send messages to parents, students and staff from its own SIM card.
This policy explains what the app does with data.

## Who uses the app
The app is intended for **school administrators only**, who pair the phone with
their school's ShuleCloud account using a one-time code. It is not intended for
children or general consumers.

## What the app accesses
- **SMS sending (SEND_SMS):** The app sends text messages that the paired school
  explicitly queues (e.g. fee reminders, exam results, announcements). The app
  **does not read, receive, intercept, or store** incoming or existing SMS. It
  only sends outgoing messages provided by the school.
- **Device information:** A device name and a randomly generated pairing token are
  used to identify the gateway phone to the school account. We may read basic
  network/battery status to show connection health on the school dashboard.
- **Notifications:** A persistent notification is shown while the gateway is
  active (required by Android for background operation).

## What we collect and store
- The app stores the pairing token and your school subdomain **locally on the
  device** so it stays connected.
- Message content and recipient numbers are **transient**: they are received from
  the school's server, sent via the SIM, and a delivery status is reported back.
  The app itself does not retain message content.
- The school's ShuleCloud server stores the messages and delivery status as part
  of the school's own records, under the school's control.

## Data sharing
We do **not** sell or share personal data with third parties. We do not use data
for advertising. Communication with the school's server is encrypted in transit
(HTTPS/WSS).

## Permissions summary
- `SEND_SMS` — send queued messages via the SIM (core function).
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` / `WAKE_LOCK` — keep
  sending reliably in the background.
- `POST_NOTIFICATIONS` — show the active-gateway notification.
- `RECEIVE_BOOT_COMPLETED` — resume the gateway after the phone restarts.

## Your choices and deletion
- A school administrator can **reset or remove** the device from the school
  portal at any time, which revokes its access immediately.
- **Uninstalling** the app removes all locally stored data (token, subdomain).

## Contact
Questions about this policy: support@shulecloud.com
