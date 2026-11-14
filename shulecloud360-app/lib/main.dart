import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'router.dart';

/// ShuleCloud 360 — one app for everyone at school. Sign in once; you see only the
/// apps your role allows (admins, finance, teachers, learners and parents).
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: ShuleCloud360()));
}

class ShuleCloud360 extends ConsumerWidget {
  const ShuleCloud360({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
        title: 'ShuleCloud 360',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: ref.watch(routerProvider),
      );
}
