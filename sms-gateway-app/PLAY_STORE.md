# Google Play submission guide — ShuleCloud SMS Gateway

Everything you need to publish `com.shulecloud.smsgateway`. The hard part for any
SMS app is the **Permissions Declaration** (section 4) — Google manually reviews
every app that requests `SEND_SMS`. Copy the text below into Play Console.

---

## 1. One-time setup
1. Create a Google Play Developer account ($25 one-time): https://play.google.com/console/signup
2. Create app → name **ShuleCloud SMS**, type **App**, **Free**.
3. Upload the **production AAB** built with `eas build -p android --profile production`.
   (EAS manages the signing keystore; let Play use Play App Signing.)

---

## 2. Store listing

**App name:** ShuleCloud SMS

**Short description (≤80 chars):**
> Turn an Android phone into your school's SMS gateway for ShuleCloud.

**Full description:**
> ShuleCloud SMS lets a school send text messages to parents, students and staff
> directly from an Android phone's SIM card — no expensive SMS gateway required.
>
> The school's ShuleCloud system queues messages (fee reminders, exam results,
> announcements, emergencies), and this app sends them through the connected
> phone. It is a companion to the ShuleCloud School Management System and is used
> only by school administrators who pair the phone with their school account.
>
> Features
> • Pair securely to your school with a one-time code
> • Sends queued SMS automatically through the phone's SIM
> • Works in the background with a persistent status notification
> • Delivery status reported back to the school dashboard
> • Battery- and network-aware; resumes after reconnection
>
> This app is intended for schools using ShuleCloud. You need a school account
> and a pairing code from your school portal to use it.

**Category:** Education
**Tags:** education, school, communication
**Contact email:** support@shulecloud.com   ← change to your real address
**Website:** https://shulecloud.com

**Graphics required by Play:**
- App icon 512×512 (PNG) — export from `assets/icon.png` (it's 1024; downscale to 512)
- Feature graphic 1024×500 (PNG/JPG)
- At least 2 phone screenshots (take from the running app: pairing screen + dashboard)

---

## 3. App content / Data safety form

**Does your app collect or share user data?** Yes (minimal).
- **Data collected:**
  - *Device or other IDs* — a device pairing token + device name (to identify the gateway phone). Purpose: App functionality. Not shared. Not used for ads.
  - *App activity / Messages* — the SMS text + recipient number passed from the school for sending. Purpose: App functionality. Not shared with third parties. **Processed/transient** (the phone sends it; it is not stored by the app).
- **Is data encrypted in transit?** Yes (HTTPS/WSS).
- **Can users request deletion?** Yes — the school admin can reset/remove the device, which revokes its token; uninstalling removes all local data.

**SMS/Call Log Permissions form (App content → Sensitive app permissions):** see section 4.

**Ads:** No.
**Target audience:** Adults (school staff) — NOT designed for children. (This avoids the
Families policy even though it's an education app.)

---

## 4. SMS Permissions Declaration  ★ critical ★

Play Console → App content → **"Permissions declaration form"** for SMS/Call Log.

**Which permission(s):** `SEND_SMS`

**Core functionality requiring it:**
> The app functions as an SMS gateway for schools. A school's ShuleCloud
> management system queues messages (fee reminders, exam results, official
> announcements, emergency notices) and this app sends them to parents and staff
> using the SEND_SMS permission via the device's SIM. Sending SMS is the app's
> sole, core purpose; it cannot function without SEND_SMS. The app does not read,
> receive, or store SMS — it only sends messages explicitly queued by the paired
> school account.

**Why an alternative (non-SMS) method can't be used:**
> The product exists specifically to let schools send SMS from their own SIM and
> airtime instead of paying a bulk-SMS gateway. Any alternative (push, email, a
> paid SMS API) defeats the core value proposition and the offline/low-data
> reliability schools depend on. The SEND_SMS permission is therefore essential
> and irreplaceable for this use case.

**Is it a default SMS handler?** No.
**Video demo:** Record a 30–60s screen capture: open app → enter subdomain + code →
pair → dashboard shows "Connected", then a message sends. Upload to an unlisted
YouTube link and paste it in the form (Google usually asks for this).

> ⚠️ Reality check: Google's SMS policy is strict. Apps that send SMS as core
> functionality are allowed, but expect 1–2 review rounds. If rejected, the most
> common asks are: a clearer demo video, and a privacy policy URL that explicitly
> covers SMS handling (section 5).

---

## 5. Privacy policy (required, must be a public URL)

Host the text in `PRIVACY.md` at a public URL (e.g. https://shulecloud.com/sms-app-privacy)
and paste that URL in Play Console → App content → Privacy policy.

---

## 6. Release
1. Production → Create new release → upload the `.aab`.
2. Fill release notes (e.g. "Initial release.").
3. Roll out. First review with SMS permission typically takes a few days.

> Tip: while waiting on SMS approval you can distribute the **APK** (the EAS
> `preview` build link) directly to schools via "Allow restricted settings".
