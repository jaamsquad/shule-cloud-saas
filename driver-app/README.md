# ShuleCloud Driver

A production-ready Flutter app for school bus drivers — live GPS tracking, trip lifecycle, student boarding, QR scanning, incident reporting, vehicle inspection and emergency SOS. Built with **Material 3**, **Riverpod**, **GoRouter**, **Dio**, and **Clean Architecture**.

> This project lives in `driver-app/` inside the ShuleCloud monorepo but is a **standalone Flutter app** — open this folder directly in your Flutter IDE.

---

## Quick start

```bash
cd driver-app
flutter pub get

# (optional) regenerate the Hive adapter — a hand-written one is already committed
flutter pub run build_runner build --delete-conflicting-outputs

flutter run
```

### Before running you must configure:

1. **Backend URL** — `lib/core/constants/app_constants.dart` → `ApiConfig.baseUrl`.
   - Production: `https://api.shulecloud.com/api/v1` (tenant resolved by the `x-tenant-subdomain` header the app sends automatically — it's the **School Code** entered at login, e.g. `kilimo`).
   - Local dev on an Android emulator pointing at your dev server: `http://10.0.2.2:5000/api/v1` (10.0.2.2 = your PC's localhost from the emulator). On a real phone, use your PC's LAN IP, e.g. `http://192.168.1.20:5000/api/v1`.
2. **Google Maps key** — `android/app/src/main/AndroidManifest.xml` (`com.google.android.geo.API_KEY`) and, for iOS, `ios/Runner/AppDelegate.swift`.
3. **Firebase** (push) — add `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) and run `flutterfire configure` to generate `lib/firebase_options.dart`. The app runs without it (FCM is guarded).

### The backend endpoints already exist

The matching Node endpoints live in `backend/src/routes/driver.routes.ts` (mounted at `/api/v1`). A **driver is a staff member** with a transport role, linked to a `transport_zones` record. Log in with the driver's **portal username + portal password** (the same credentials as the staff portal). Set those on the staff record and assign the staff as `driver` (or `driverId`) on a transport zone.

---

## Architecture (Clean Architecture)

```
lib/
├── core/            # theme, constants, error types, Result
├── models/          # driver, student, route, trip, gps_point, notification, inspection
├── services/        # api_client, storage, location, background tracking, connectivity,
│                    #   gps_queue (offline), tracking_uploader, notifications, socket
├── repositories/    # auth, trip, student, safety  (talk to services, return models)
├── providers/       # Riverpod DI graph + state notifiers (auth, trip, data, settings)
├── routes/          # GoRouter (shell + full-screen flows)
├── widgets/         # reusable UI (cards, action tiles, skeletons, main shell)
└── features/        # one folder per screen (splash, auth, dashboard, map, students,
                     #   qr, route, notifications, incident, inspection, sos, settings)
```

**UI → Providers → Repositories → Services → API.** UI never calls Dio directly.

---

## Key flows

| Feature | Notes |
|---|---|
| **Auth** | JWT stored in `flutter_secure_storage`; auto-login on splash; 401 → silent refresh + retry in `ApiClient`. |
| **Trip lifecycle** | `TripController` enforces valid transitions (Not Started → Started → Paused ⇄ Started → Completed). Invalid ones (e.g. End before Start) are rejected. |
| **Background GPS** | `BackgroundTrackingService` runs a foreground service; samples every ~8s / 25m; keeps running when locked/minimised; stops on End Trip or logout. |
| **Offline** | Failed location posts go to a Hive queue (`GpsQueue`); flushed in batches by `TrackingUploader` the moment connectivity returns (wired in `main.dart`). No data is lost. |
| **Boarding** | Swipe (flutter_slidable) or detail-screen buttons; optimistic UI with revert-on-failure. |
| **QR** | `mobile_scanner` → `POST /students/scan` → Board/Drop. |
| **Inspection** | Configurable gate — the dashboard blocks Start Trip until the checklist is complete (toggle in Settings). |
| **SOS** | Long-press sends driver + bus + trip + GPS + timestamp. |

---

## Backend contract (implemented in `backend/src/routes/driver.routes.ts`)

All under `ApiConfig.baseUrl` (`/api/v1`), JWT in `Authorization: Bearer`, tenant in `x-tenant-subdomain`.

```
POST /driver/login            { schoolCode, identifier, password } → { accessToken, refreshToken, driver }
POST /driver/refresh          { refreshToken } → { accessToken, refreshToken }
GET  /driver/me               → Driver
GET  /driver/route/today      → BusRoute (stops[])
POST /driver/trip/start|pause|resume|end   → Trip
POST /tracker/location        GpsPoint            ← live tracking → bus_locations + bus_positions
POST /tracker/location/batch  { points: GpsPoint[] }   ← offline flush
GET  /driver/students         → Student[]   (by transportZone)
POST /driver/students/board|drop   { studentId }   → transport_pickups
POST /driver/students/scan    { code } → Student
POST /driver/sos              { lat, lng, tripId, timestamp }   → driver_sos
POST /driver/incident         { type, description, lat, lng, photo, timestamp }   → driver_incidents
POST /driver/inspection       { checks, at }   → driver_inspections
GET  /driver/notifications    → AppNotification[]   (from announcements)
```

See each `models/*.dart` `fromJson` for the exact field shapes (they tolerate common aliases like `_id`/`id`).

---

## Permissions

Android permissions (incl. `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`) are declared in `AndroidManifest.xml`. For **iOS**, add to `Info.plist`:

```
NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationWhenInUseUsageDescription,
UIBackgroundModes = [location, fetch, remote-notification], NSCameraUsageDescription
```

---

## Notes / next steps

- The Hive adapter `models/gps_point.g.dart` is committed hand-written so the app builds immediately; regenerate it if you change `GpsPoint`.
- Swap the map placeholder camera in `MapScreen` for your school's coordinates.
- Wire `NotificationService.fcmToken` to a `POST /api/driver/device-token` when you add that endpoint.
