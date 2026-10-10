import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'session.dart';

/// Apps → sections → pages. The admin catalogue is generated from the web app
/// (frontend/scripts/export-apps.ts → assets/apps.json) so phone and web always match.
/// Teacher, student and parent apps point at their web portals.
class PageDef {
  final String label, path;
  final String? perm;
  final bool create;
  const PageDef(this.label, this.path, {this.perm, this.create = false});
}

class SectionDef {
  final String label;
  final String? module;
  final List<PageDef> pages;
  const SectionDef(this.label, this.module, this.pages);
}

enum Portal { admin, staff, student, parent }

class AppDef {
  final String key, name, description, category;
  final Color color;
  final IconData icon;
  final String? path;            // single-page app
  final List<String> modules;
  final List<SectionDef> sections;
  final Portal portal;
  final bool locked;             // not in the school's plan
  const AppDef({required this.key, required this.name, required this.description, required this.category, required this.color, required this.icon,
      this.path, this.modules = const [], this.sections = const [], this.portal = Portal.admin, this.locked = false});

  AppDef withSections(List<SectionDef> s, {bool locked = false}) =>
      AppDef(key: key, name: name, description: description, category: category, color: color, icon: icon, path: path, modules: modules, sections: s, portal: portal, locked: locked);
}

const _icons = <String, IconData>{
  'academics': Icons.school_outlined, 'exams': Icons.assignment_outlined, 'cbc': Icons.menu_book_outlined, 'elearning': Icons.videocam_outlined,
  'students': Icons.groups_outlined, 'frontdesk': Icons.meeting_room_outlined, 'communication': Icons.forum_outlined,
  'attendance': Icons.how_to_reg_outlined, 'boarding': Icons.bed_outlined, 'library': Icons.local_library_outlined, 'transport': Icons.directions_bus_outlined,
  'activities': Icons.emoji_events_outlined, 'fees': Icons.payments_outlined, 'accounting': Icons.balance_outlined, 'payroll': Icons.account_balance_wallet_outlined,
  'pos': Icons.shopping_cart_outlined, 'overview': Icons.dashboard_outlined, 'hr': Icons.badge_outlined, 'reports': Icons.bar_chart_outlined,
  'administration': Icons.settings_outlined, 'more': Icons.widgets_outlined,
};

class Catalog {
  final List<String> categories;
  final List<AppDef> adminApps;
  const Catalog(this.categories, this.adminApps);
}

final catalogProvider = FutureProvider<Catalog>((ref) async {
  final j = jsonDecode(await rootBundle.loadString('assets/apps.json'));
  final cats = (j['categories'] as List).map((c) => c['key'].toString()).toList();
  final apps = (j['apps'] as List).map((a) {
    return AppDef(
      key: a['key'], name: a['name'], description: a['description'], category: a['category'],
      color: Color(int.parse('FF${a['color'].toString().replaceAll('#', '')}', radix: 16)),
      icon: _icons[a['key']] ?? Icons.apps_outlined, path: a['path'], modules: List<String>.from(a['modules'] ?? const []),
      sections: (a['sections'] as List).map((s) => SectionDef(s['label'], s['module'],
          (s['pages'] as List).map((p) => PageDef(p['label'], p['path'], perm: p['perm'], create: p['create'] == true)).toList())).toList(),
    );
  }).toList();
  return Catalog(cats, apps);
});

// ── Portal apps for teachers, learners and parents (their web portal pages) ──
const _teach = Color(0xFF0F7A8A), _stud = Color(0xFF16A34A), _par = Color(0xFF7C3AED);
const teacherApps = <AppDef>[
  AppDef(key: 't_classes', name: 'My Classes', category: 'Teaching', color: _teach, icon: Icons.class_outlined, portal: Portal.staff, description: 'Classes, learners and class lists',
      sections: [SectionDef('My Classes', null, [PageDef('My Classes', '/classes'), PageDef('Timetable', '/timetable'), PageDef('Calendar', '/calendar')])]),
  AppDef(key: 't_attendance', name: 'Attendance', category: 'Teaching', color: _teach, icon: Icons.how_to_reg_outlined, portal: Portal.staff, description: 'Mark class attendance, my attendance',
      sections: [SectionDef('Attendance', null, [PageDef('Mark Attendance', '/attendance'), PageDef('My Attendance', '/my-attendance')])]),
  AppDef(key: 't_assessment', name: 'Assessment', category: 'Teaching', color: _teach, icon: Icons.assignment_outlined, portal: Portal.staff, description: 'Marks entry, CBC, results',
      sections: [SectionDef('Assessment', null, [PageDef('Marks Entry', '/marks'), PageDef('CBC Assessment', '/cbc'), PageDef('Results', '/results')])]),
  AppDef(key: 't_content', name: 'Teaching Content', category: 'Teaching', color: _teach, icon: Icons.menu_book_outlined, portal: Portal.staff, description: 'Lesson plans, schemes, resources, homework',
      sections: [SectionDef('Content', null, [PageDef('Lesson Plans', '/lesson-plans'), PageDef('Schemes of Work', '/schemes'), PageDef('Resources', '/resources'),
        PageDef('Shared Resources', '/shared-resources'), PageDef('Assignments', '/assignments'), PageDef('Homework', '/homework'), PageDef('Live Classes', '/live')])]),
  AppDef(key: 't_comms', name: 'Messages', category: 'Teaching', color: _teach, icon: Icons.forum_outlined, portal: Portal.staff, description: 'Announcements, message parents',
      sections: [SectionDef('Messages', null, [PageDef('Announcements', '/announcements'), PageDef('Message Parents', '/message-parents')])]),
  AppDef(key: 't_me', name: 'My Work', category: 'Teaching', color: _teach, icon: Icons.badge_outlined, portal: Portal.staff, description: 'Profile, leave',
      sections: [SectionDef('Me', null, [PageDef('My Profile', '/'), PageDef('Leave', '/leave')])]),
];
const studentApps = <AppDef>[
  AppDef(key: 's_learning', name: 'Learning', category: 'My School', color: _stud, icon: Icons.menu_book_outlined, portal: Portal.student, description: 'Timetable, assignments, homework, resources, live classes',
      sections: [SectionDef('Learning', null, [PageDef('Timetable', '/timetable'), PageDef('Assignments', '/assignments'), PageDef('Homework', '/homework'),
        PageDef('Resources', '/resources'), PageDef('Live Classes', '/live'), PageDef('Online Exams', '/online-exams')])]),
  AppDef(key: 's_results', name: 'Results', category: 'My School', color: _stud, icon: Icons.insights_outlined, portal: Portal.student, description: 'Exam results and report cards',
      sections: [SectionDef('Results', null, [PageDef('Exam Results', '/exam-results')])]),
  AppDef(key: 's_fees', name: 'Fees', category: 'My School', color: _stud, icon: Icons.payments_outlined, portal: Portal.student, description: 'Fee structure, pay, wallet, receipts',
      sections: [SectionDef('Fees', null, [PageDef('Fee Structure', '/fees/structure'), PageDef('Pay Fees', '/fees/pay'), PageDef('Wallet', '/wallet'), PageDef('Receipts', '/receipts')])]),
  AppDef(key: 's_me', name: 'My Profile', category: 'My School', color: _stud, icon: Icons.person_outline, portal: Portal.student, description: 'Profile, registration, requests, clearance',
      sections: [SectionDef('Me', null, [PageDef('Profile', '/profile'), PageDef('Registration', '/registration'), PageDef('Requisition', '/requisition'), PageDef('Clearance', '/clearance')])]),
];
const parentApps = <AppDef>[
  AppDef(key: 'p_progress', name: 'Progress', category: 'My Children', color: _par, icon: Icons.insights_outlined, portal: Portal.parent, description: 'Results, analytics, attendance, timetable',
      sections: [SectionDef('Progress', null, [PageDef('Results', '/results'), PageDef('Analytics', '/analytics'), PageDef('Attendance', '/attendance'), PageDef('Timetable', '/timetable')])]),
  AppDef(key: 'p_fees', name: 'Fees', category: 'My Children', color: _par, icon: Icons.payments_outlined, portal: Portal.parent, description: 'Balances, pay, wallet, receipts',
      sections: [SectionDef('Fees', null, [PageDef('Fees', '/fees'), PageDef('Wallet', '/wallet'), PageDef('Receipts', '/receipts')])]),
  AppDef(key: 'p_life', name: 'School Life', category: 'My Children', color: _par, icon: Icons.emoji_events_outlined, portal: Portal.parent, description: 'Trips, sports, announcements, inbox',
      sections: [SectionDef('School Life', null, [PageDef('Announcements', '/announcements'), PageDef('Inbox', '/inbox'), PageDef('Trips', '/trips'), PageDef('Sports', '/sports')])]),
  AppDef(key: 'p_home', name: 'Overview', category: 'My Children', color: _par, icon: Icons.dashboard_outlined, portal: Portal.parent, description: 'Your children at a glance',
      sections: [SectionDef('Overview', null, [PageDef('Dashboard', '/')])]),
];

/// The apps this person may open — the same rules as the web sidebar (lib/useAppAccess.ts).
List<AppDef> visibleApps(Session s, Catalog cat) {
  switch (s.kind) {
    case UserKind.teacher: return teacherApps;
    case UserKind.student: return studentApps;
    case UserKind.parent: return parentApps;
    case UserKind.admin: break;
  }
  final granted = s.permissions;
  final all = s.isAdmin;
  final appGrants = granted.where((c) => c.startsWith('app.')).map((c) => c.substring(4)).toSet();
  final byApp = cat.adminApps.where((a) => appGrants.contains(a.key)).expand((a) => a.modules).toSet();
  bool planLocked(String? m) => m != null && s.planModules != null && !s.planModules!.contains(m);
  bool switchedOff(String? m) => m != null && s.disabledModules.contains(m);
  bool canModule(String? m) => switchedOff(m) ? false : m == null ? all : (all || m == 'dashboard' || s.modules.contains(m) || byApp.contains(m));

  List<PageDef> pagesOf(SectionDef sec) {
    if (all) return sec.pages;
    final secPerms = sec.pages.map((p) => p.perm).whereType<String>().toList();
    final fine = secPerms.any(granted.contains);
    return sec.pages.where((p) {
      if (fine && p.perm != null && !granted.contains(p.perm)) return false;
      if (!p.create) return true;
      return (s.crud[sec.module] ?? const []).contains('create');
    }).toList();
  }

  final out = <AppDef>[];
  for (final a in cat.adminApps) {
    if (s.disabledApps.contains(a.key)) continue;   // switched off for this school by ShuleCloud
    final secs = a.sections.where((sec) => canModule(sec.module) && !planLocked(sec.module)).map((sec) => SectionDef(sec.label, sec.module, pagesOf(sec))).where((sec) => sec.pages.isNotEmpty).toList();
    final pathOk = a.path != null && a.modules.any(canModule);
    final lockedOnly = secs.isEmpty && a.sections.any((sec) => planLocked(sec.module) && (all || canModule(sec.module)));
    if (secs.isNotEmpty || pathOk) {
      out.add(a.withSections(secs));
    } else if (lockedOnly) {
      out.add(a.withSections(const [], locked: true));
    }
  }
  if (s.canTeach) {
    out.addAll(teacherApps.map((t) => AppDef(key: t.key, name: t.name, description: t.description, category: 'Teaching', color: t.color, icon: t.icon, sections: t.sections, portal: Portal.staff)));
  }
  return out;
}

List<String> categoriesFor(Session s, Catalog cat) {
  switch (s.kind) {
    case UserKind.teacher: return const ['Teaching'];
    case UserKind.student: return const ['My School'];
    case UserKind.parent: return const ['My Children'];
    case UserKind.admin: return [...cat.categories, if (s.canTeach) 'Teaching'];
  }
}

final appsProvider = Provider<AsyncValue<List<AppDef>>>((ref) {
  final s = ref.watch(sessionProvider).valueOrNull;
  final cat = ref.watch(catalogProvider);
  if (s == null) return const AsyncValue.data([]);
  return cat.whenData((c) => visibleApps(s, c));
});
