import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'providers/settings_provider.dart';
import 'routes/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Every init is guarded independently so a single failure can NEVER freeze the
  // app on the native splash — runApp() always runs. (Driver-app lesson.)

  try {
    await Hive.initFlutter();
    await Hive.openBox(StorageKeys.prefsBox);
    await Hive.openBox(StorageKeys.cacheBox);
  } catch (e) {
    debugPrint('Hive init failed: $e');
  }

  runApp(const ProviderScope(child: ShuleCloudStudentApp()));
}

class ShuleCloudStudentApp extends ConsumerWidget {
  const ShuleCloudStudentApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    return MaterialApp.router(
      title: 'ShuleCloud Student',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: settings.themeMode,
      routerConfig: appRouter,
    );
  }
}
