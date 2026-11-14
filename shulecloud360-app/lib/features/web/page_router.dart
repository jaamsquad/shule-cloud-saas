import 'package:flutter/material.dart';
import '../../core/catalog.dart';
import '../native/invoices_screen.dart';
import '../native/students_screen.dart';
import '../native/teacher_classes_screen.dart';
import 'web_page_screen.dart';

/// Opens a page: the native screen when the app has one, otherwise the school's web page.
Widget openPage({required String portal, required String path, required String title, bool forceWeb = false}) {
  final p = Portal.values.firstWhere((x) => x.name == portal, orElse: () => Portal.admin);
  if (!forceWeb) {
    if (p == Portal.admin && path == '/students') return const StudentsScreen();
    if (p == Portal.admin && path == '/fees/invoices') return const InvoicesScreen();
    if (p == Portal.staff && path == '/classes') return const TeacherClassesScreen();
  }
  return WebPageScreen(title: title, path: path, portal: p);
}
