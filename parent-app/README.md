# ShuleCloud Parent

A production-ready Flutter app for parents/guardians to monitor academics,
attendance, fees, transport, homework, communication, and school updates.

Built with **Clean Architecture + Riverpod + GoRouter + Dio**, Material 3, and
**OpenStreetMap** (flutter_map) for live bus tracking — **no Google Maps, no API key**.

## Build (no local Flutter SDK needed)

Pushing to `main` triggers `.github/workflows/parent-app.yml`, which builds a
debug APK in the cloud and uploads it as the **`shulecloud-parent-apk`** artifact.
Download it from the GitHub Actions run, unzip, and install `app-debug.apk`.

To build locally instead:
```bash
cd parent-app
flutter create --platforms=android,ios --org com.shulecloud .   # regenerate native scaffolding
cp android/app/src/main/AndroidManifest.xml.custom android/app/src/main/AndroidManifest.xml
flutter pub get
dart run flutter_launcher_icons
flutter build apk --debug
```

## Connect to the backend

`lib/core/constants/app_constants.dart` → `ApiConfig.baseUrl`.
- Production: `https://api.shulecloud.com/api/v1` — the **School Code** entered at
  login becomes the `x-tenant-subdomain` header (sent automatically).
- Local emulator: `http://10.0.2.2:5000/api/v1`.

Log in with the **parent's** portal credentials (`/auth/parent-login`). The
parent token is scoped to their child; the student-portal endpoints return that
child's attendance, results, homework, timetable, fees, etc. Multiple children
show the student-select screen.

## Architecture

```
lib/
  core/        theme (M3, CardThemeData), constants, error
  services/    api_client (JWT + tenant + refresh), storage, connectivity, socket, notifications
  models/      parent, student, attendance, academics, homework, timetable, fees, misc (library/messages/announcements/calendar/bus)
  repositories/ auth_repository, data_repository (cache-first offline)
  providers/   DI + auth/state + per-screen FutureProviders + settings
  features/    splash, auth, shell, dashboard, bus (OSM), academics, attendance, misc (11 screens)
  routes/      app_router (GoRouter)
  main.dart    guarded inits (Firebase/Hive/notifications all optional)
```

## Notes (lessons applied from the driver app)

- `CardThemeData` (not `CardTheme`) in the theme — avoids the M3 compile error.
- **Every** init in `main()` is guarded; Firebase/FCM is optional (no
  `google-services.json` needed) — the app never hangs on the splash.
- The **committed `AndroidManifest.xml.custom`** carries permissions + an Android-11
  `<queries>` block (so `canLaunchUrl` works for tel/sms/maps) and is restored by CI
  after `flutter create`.
- CI enables **core library desugaring** for `flutter_local_notifications`.
- No `assets:` folder is declared that doesn't exist (only `assets/icon/`).

## Firebase push (optional)

Add `google-services.json` (Android) and run `flutterfire configure` to enable
FCM. The app runs fully without it.
