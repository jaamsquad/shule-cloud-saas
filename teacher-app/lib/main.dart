import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'providers/settings_provider.dart';
import 'routes/app_router.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Every init is guarded independently so a single failure can NEVER freeze the
  // app on the native splash — runApp() always runs. (Driver-app lesson.)

  try {
    await Firebase.initializeApp();
  } catch (_) {/* Firebase optional — configure firebase_options for push */}

  try {
    await Hive.initFlutter();
    await Hive.openBox(StorageKeys.prefsBox);
    await Hive.openBox(StorageKeys.cacheBox);
  } catch (e) {
    debugPrint('Hive init failed: $e');
  }

  try {
    await NotificationService().init();
  } catch (e) {
    debugPrint('NotificationService.init failed: $e');
  }

  runApp(const ProviderScope(child: ShuleCloudTeacherApp()));
}

class ShuleCloudTeacherApp extends ConsumerWidget {
  const ShuleCloudTeacherApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    return MaterialApp.router(
      title: 'ShuleCloud Teacher',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: settings.themeMode,
      routerConfig: appRouter,
    );
  }
}
