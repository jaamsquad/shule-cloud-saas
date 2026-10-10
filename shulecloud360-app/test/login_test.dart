import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shulecloud_360/features/login/login_screen.dart';
import 'package:shulecloud_360/features/login/school_lookup.dart';
import 'package:shulecloud_360/features/login/welcome_screen.dart';

// The welcome page and the first sign-in step render and respond.
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  Widget host(Widget w) => ProviderScope(child: MaterialApp(home: w));

  testWidgets('welcome page shows what 360 is and a Get started button', (t) async {
    await t.pumpWidget(host(const WelcomeScreen()));
    await t.pump(const Duration(seconds: 2));
    expect(find.text('One app for everyone'), findsOneWidget);
    expect(find.text('Get started'), findsOneWidget);
  });

  testWidgets('sign-in starts at the School ID and asks for it when empty', (t) async {
    await t.pumpWidget(host(const LoginScreen()));
    await t.pump(const Duration(seconds: 1));
    expect(find.text('Find your school'), findsOneWidget);
    expect(find.text('Step 1 of 3'), findsOneWidget);
    await t.tap(find.text('Find school'));
    await t.pump(const Duration(milliseconds: 600));
    expect(find.text('Enter your School ID.'), findsOneWidget);
  });

  testWidgets('a recent school can be picked straight away', (t) async {
    await RecentSchools.remember(const SchoolInfo(code: 'A482917M', name: 'Kilimo Academy', subdomain: 'kilimo', schoolId: 'A482917M'));
    await t.pumpWidget(host(const LoginScreen()));
    await t.pump(const Duration(seconds: 1));
    await t.tap(find.text('Kilimo Academy'));
    await t.pump(const Duration(seconds: 1));
    expect(find.text('Continue'), findsOneWidget);
    await t.tap(find.text('Continue'));
    await t.pump(const Duration(seconds: 1));
    expect(find.text("Who's signing in?"), findsOneWidget);
    expect(find.text('Step 2 of 3'), findsOneWidget);
  });
}
