import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shulecloud_360/core/catalog.dart';
import 'package:shulecloud_360/core/session.dart';

// The phone must show the same apps the web would for a role.
void main() {
  const cat = Catalog(['Academics', 'Financial'], [
    AppDef(key: 'exams', name: 'Exams', description: '', category: 'Academics', color: Color(0xFF5C67F2), icon: Icons.school, modules: ['exams'],
        sections: [SectionDef('Exams', 'exams', [PageDef('Marks', '/exams/marks', perm: 'exams.marks'), PageDef('Create', '/exams/create', perm: 'exams.create', create: true)])]),
    AppDef(key: 'fees', name: 'Fees', description: '', category: 'Financial', color: Color(0xFF5C67F2), icon: Icons.school, modules: ['fees'],
        sections: [SectionDef('Fees', 'fees', [PageDef('Invoices', '/fees/invoices', perm: 'fees.invoices')])]),
  ]);
  Session s(List<String> mods, List<String> perms, {String role = 'teacher', UserKind kind = UserKind.admin, List<String> off = const []}) =>
      Session(kind: kind, token: 't', subdomain: 'x', schoolCode: 'A1M', name: 'N', role: role, user: const {}, modules: mods, permissions: perms,
          disabledApps: off, disabledModules: off.isEmpty ? const [] : const ['fees']);

  test('admin sees all apps and pages', () {
    final apps = visibleApps(s(['*'], ['*'], role: 'school_admin'), cat);
    expect(apps.map((a) => a.key), ['exams', 'fees']);
    expect(apps.first.sections.first.pages.length, 2);
  });
  test('a role only sees its modules; create pages need the create right', () {
    final apps = visibleApps(s(['dashboard', 'exams'], ['exams.marks']), cat);
    expect(apps.map((a) => a.key), ['exams']);
    expect(apps.first.sections.first.pages.map((p) => p.label), ['Marks']);
  });
  test('app.<key> grants the whole app', () {
    final apps = visibleApps(s(['dashboard'], ['app.fees']), cat);
    expect(apps.map((a) => a.key), ['fees']);
  });
  test('an app switched off for the school is hidden, even for admins', () {
    final apps = visibleApps(s(['*'], ['*'], role: 'school_admin', off: ['fees']), cat);
    expect(apps.map((a) => a.key), ['exams']);
  });
  test('learners get the student portal apps', () {
    expect(visibleApps(s(const [], const [], kind: UserKind.student), cat).first.portal, Portal.student);
  });

  group('menu follows the web sidebar', () {
    const side = Catalog(['Academics'], [], [
      AppDef(key: 'g_classes', name: 'Classes', description: '', category: menuCategory, color: Color(0xFF2F7BF5), icon: Icons.class_outlined, modules: ['classes'],
          sections: [SectionDef('Classes', 'classes', [PageDef('All Classes', '/classes')])]),
      AppDef(key: 'g_fees', name: 'Fees', description: '', category: menuCategory, color: Color(0xFF2F7BF5), icon: Icons.payments_outlined, modules: ['fees'],
          sections: [SectionDef('Fees', 'fees', [PageDef('Invoices', '/fees/invoices')])]),
    ]);
    Session admin({String? staffToken, String portal = 'admin', List<String> mods = const ['*']}) => Session(
        kind: UserKind.admin, token: 't', staffToken: staffToken, subdomain: 'x', schoolCode: 'A1M', name: 'N', role: 'bursar', user: const {},
        modules: mods, permissions: mods, portal: portal);

    test('groups come in sidebar order and follow the role', () {
      expect(visibleApps(admin(), side).map((a) => a.name), ['Classes', 'Fees']);
      expect(visibleApps(admin(mods: const ['dashboard', 'fees']), side).map((a) => a.name), ['Fees']);
    });
    test('staff with both portals can switch to the teacher portal', () {
      final both = admin(staffToken: 'st');
      expect(both.hasBothPortals, isTrue);
      expect(visibleApps(both, side).map((a) => a.name), ['Classes', 'Fees']);
      final teaching = both.copyWith(portal: 'teacher');
      expect(teaching.teaching, isTrue);
      expect(visibleApps(teaching, side).first.portal, Portal.staff);
    });
    test('admin without a teacher login has no switcher', () {
      expect(admin().hasBothPortals, isFalse);
      expect(admin(portal: 'teacher').teaching, isFalse);
    });
    test('teacher-only staff stay in the teacher portal', () {
      const t = Session(kind: UserKind.teacher, token: 't', staffToken: 't', subdomain: 'x', schoolCode: 'A1M', name: 'N', role: 'teacher', user: {});
      expect(t.hasBothPortals, isFalse);
      expect(visibleApps(t, side).every((a) => a.portal == Portal.staff), isTrue);
    });
  });
}
