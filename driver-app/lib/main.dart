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

  // Firebase is optional in dev — guard so the app still runs without config.
  try {
    await Firebase.initializeApp();
  } catch (_) {/* configure firebase_options for release */}

  // Local storage.
  await Hive.initFlutter();
  Hive.registerAdapter(GpsPointAdapter());
  await Hive.openBox<GpsPoint>(StorageKeys.gpsQueueBox);
  await Hive.openBox(StorageKeys.prefsBox);

  // Background GPS + notifications.
  await BackgroundTrackingService.init();
  await NotificationService().init();

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
