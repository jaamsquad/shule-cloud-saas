# ShuleCloud 360

One app for everyone at school. Admins, bursars, secretaries, teachers, learners and parents all sign in with the same screen (School ID + their usual sign-in), and each person only sees the apps their role allows — the same apps, sections and pages as the ShuleCloud web app.

## How it works

- **Sign-in** — `POST /auth/smart-login` with the School ID (e.g. `A482917M`) or school address. Two-step sign-in (emailed code) is supported, with "remember this phone".
- **What you see**
  - *Admin-app users* (admins, finance, HR, front office…): apps come from `assets/apps.json` and are filtered with `/auth/my-permissions` exactly like the web sidebar (modules, `app.<key>` grants, page permissions, create rights, plan locks).
  - *Teachers, learners and parents*: their portal apps (classes, attendance, marks, results, fees…).
- **Screens** — Home (greeting, today's numbers, Quick Access with stars and recent apps), Apps (by category, with search), an app dashboard per app, Account. Students, Invoices and My Classes are native screens; every other page opens the real web page inside the app, already signed in, without the web's own menus (`?embed=1`).

## Keeping apps in sync with the web

The apps catalogue is generated from the web app:

```bash
cd frontend && npx tsx --tsconfig tsconfig.app.json scripts/export-apps.ts
```

## Build

```bash
flutter pub get
flutter run                                    # debug
flutter build apk --release                    # Android
flutter build ipa                              # iOS
# point at another server:
flutter build apk --dart-define=API_BASE=https://api.example.com/api/v1 --dart-define=WEB_DOMAIN=example.com
```
