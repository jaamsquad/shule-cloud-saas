import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'models/gps_point.dart';
import 'providers/settings_provider.dart';
import 'providers/providers.dart';
import 'routes/app_router.dart';
import 'services/background_tracking_service.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Every init below is guarded independently so a single failure can NEVER
  // freeze the app on the native splash — runApp() always runs. Startup only
  // needs Hive (prefs); everything else degrades gracefully.

  // Firebase is optional in dev — guard so the app still runs without config.
  try {
    await Firebase.initializeApp();
  } catch (_) {/* configure firebase_options for release */}

  // Local storage (required). registerAdapter is idempotent-guarded.
  try {
    await Hive.initFlutter();
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(GpsPointAdapter());
    }
    await Hive.openBox<GpsPoint>(StorageKeys.gpsQueueBox);
    await Hive.openBox(StorageKeys.prefsBox);
  } catch (e, s) {
    debugPrint('Hive init failed: $e\n$s');
  }

  // Background GPS — never block startup on it.
  try {
    await BackgroundTrackingService.init();
  } catch (e) {
    debugPrint('BackgroundTrackingService.init failed: $e');
  }

  // Local notifications — never block startup on it.
  try {
    await NotificationService().init();
  } catch (e) {
    debugPrint('NotificationService.init failed: $e');
  }

  runApp(const ProviderScope(child: ShuleCloudDriverApp()));
}

class ShuleCloudDriverApp extends ConsumerWidget {
  const ShuleCloudDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Whenever connectivity returns, drain the offline GPS queue.
    ref.listen(onlineStatusProvider, (prev, next) {
      if (next.valueOrNull == true) {
        ref.read(trackingUploaderProvider).flush();
      }
    });

    final router = ref.watch(routerProvider);
    final settings = ref.watch(settingsControllerProvider);
    return MaterialApp.router(
      title: 'ShuleCloud Driver',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: settings.themeMode,
      routerConfig: router,
    );
  }
}
