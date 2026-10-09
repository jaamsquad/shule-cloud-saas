import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Web-style portal chrome (mirrors frontend/src/portals/PortalShell.tsx):
/// a green sidebar with a white logo panel and collapsible nav groups, and a
/// gold top header with search + user menu. On wide screens (tablets,
/// landscape) the sidebar is pinned; on phones it is a drawer.
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const double _pinnedBreakpoint = 900;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineStatusProvider).valueOrNull ?? true;
    final location = GoRouterState.of(context).uri.path;
    final wide = MediaQuery.sizeOf(context).width >= _pinnedBreakpoint;

    final content = Column(children: [
      if (!online) const OfflineBanner(),
      Expanded(child: child),
    ]);

    if (wide) {
      return Scaffold(
        body: Row(children: [
          SizedBox(width: 248, child: PortalSidebar(location: location, pinned: true)),
          Expanded(
            child: Column(children: [
              const _GoldHeader(showMenu: false),
              Expanded(child: content),
            ]),
          ),
        ]),
      );
    }

    final tab = bottomTabs.indexWhere((t) => t.path == location);
    return Scaffold(
      drawer: Drawer(child: PortalSidebar(location: location, pinned: false)),
      body: Column(children: [
        const _GoldHeader(showMenu: true),
        Expanded(child: content),
      ]),
      // Phones only, and only on the main pages; detail pages use the
      // sidebar/back button like the web portal.
      bottomNavigationBar: tab < 0 ? null : PortalBottomBar(tabs: bottomTabs, index: tab, onSelect: (i) => context.go(bottomTabs[i].path)),
    );
  }
}

/// Main pages reachable from the phone bottom bar.
const bottomTabs = <NavEntry>[
  NavEntry('/', 'Home', Icons.home_outlined),
  NavEntry('/results', 'Results', Icons.workspace_premium_outlined),
  NavEntry('/timetable', 'Timetable', Icons.schedule_outlined),
  NavEntry('/fees', 'Fees', Icons.credit_card),
  NavEntry('/profile', 'Profile', Icons.person_outline),
];

/// White bottom bar with an accent top indicator on the active tab.
class PortalBottomBar extends StatelessWidget {
  final List<NavEntry> tabs;
  final int index;
  final ValueChanged<int> onSelect;
  const PortalBottomBar({super.key, required this.tabs, required this.index, required this.onSelect});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color,
          border: const Border(top: BorderSide(color: AppColors.slate200)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60,
            child: Row(children: [
              for (final (i, t) in tabs.indexed)
                Expanded(
                  child: InkWell(
                    onTap: () => onSelect(i),
                    child: Column(children: [
                      Container(height: 3, margin: const EdgeInsets.symmetric(horizontal: 18), color: i == index ? AppColors.accent : Colors.transparent),
                      const Spacer(),
                      Icon(t.icon, size: 22, color: i == index ? AppColors.accent : AppColors.slate400),
                      const SizedBox(height: 3),
                      Text(t.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: i == index ? FontWeight.w800 : FontWeight.w600,
                            color: i == index ? AppColors.accent : AppColors.slate500,
                          )),
                      const Spacer(),
                    ]),
                  ),
                ),
            ]),
          ),
        ),
      );
}

// ── Navigation model (same groups as the web StaffLayout NAV) ────────────────

class NavEntry {
  final String path;
  final String label;
  final IconData icon;
  const NavEntry(this.path, this.label, this.icon);
}

class NavSection {
  final String label;
  final List<NavEntry> items;
  const NavSection(this.label, this.items);
}

const portalNav = <NavSection>[
  NavSection('Dashboard', [
    NavEntry('/', 'Home', Icons.dashboard_outlined),
    NavEntry('/profile', 'Personal Profile', Icons.person_outline),
  ]),
  NavSection('Academics', [
    NavEntry('/results', 'Exam Results', Icons.workspace_premium_outlined),
    NavEntry('/timetable', 'Timetable', Icons.schedule_outlined),
    NavEntry('/assignments', 'Assignments', Icons.assignment_outlined),
    NavEntry('/homework', 'Homework', Icons.description_outlined),
    NavEntry('/resources', 'Notes & Resources', Icons.menu_book_outlined),
    NavEntry('/calendar', 'School Calendar', Icons.calendar_month_outlined),
  ]),
  NavSection('Financials', [
    NavEntry('/fees', 'Fees & Payment', Icons.credit_card),
    NavEntry('/wallet', 'My Wallet', Icons.account_balance_wallet_outlined),
    NavEntry('/receipts', 'Receipts', Icons.receipt_long_outlined),
  ]),
  NavSection('Account', [
    NavEntry('/settings', 'Settings', Icons.settings_outlined),
  ]),
];

/// Longest nav path that prefixes [location] (so /assignments/homework
/// highlights Homework, not Assignments).
String? activeNavPath(String location) {
  String? best;
  for (final s in portalNav) {
    for (final e in s.items) {
      final match = e.path == '/' ? location == '/' : (location == e.path || location.startsWith('${e.path}/'));
      if (match && (best == null || e.path.length > best.length)) best = e.path;
    }
  }
  return best;
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

class PortalSidebar extends ConsumerStatefulWidget {
  final String location;
  final bool pinned;
  const PortalSidebar({super.key, required this.location, required this.pinned});

  @override
  ConsumerState<PortalSidebar> createState() => _PortalSidebarState();
}

class _PortalSidebarState extends ConsumerState<PortalSidebar> {
  final Set<String> _collapsed = {};

  void _go(String path) {
    if (!widget.pinned) Navigator.of(context).pop(); // close drawer
    context.go(path);
  }

  @override
  Widget build(BuildContext context) {
    final active = activeNavPath(widget.location);
    const brand = 'Student Portal';

    return Container(
      color: AppColors.accent,
      child: Column(children: [
        // White logo panel
        Container(
          color: Colors.white,
          padding: EdgeInsets.only(top: widget.pinned ? 0 : MediaQuery.paddingOf(context).top),
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.hairline))),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                child: const Icon(Icons.school_outlined, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(brand,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w900, fontSize: 14)),
                  Text('ShuleCloud Student', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.w700, fontSize: 10.5)),
                ]),
              ),
            ]),
          ),
        ),

        // Collapsible nav groups
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              for (final section in portalNav) ...[
                InkWell(
                  onTap: () => setState(() => _collapsed.contains(section.label)
                      ? _collapsed.remove(section.label)
                      : _collapsed.add(section.label)),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 16, 4),
                    child: Row(children: [
                      Expanded(
                        child: Text(section.label.toUpperCase(),
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.6), fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w900)),
                      ),
                      AnimatedRotation(
                        turns: _collapsed.contains(section.label) ? -0.25 : 0,
                        duration: const Duration(milliseconds: 150),
                        child: Icon(Icons.expand_more, size: 16, color: Colors.white.withValues(alpha: 0.6)),
                      ),
                    ]),
                  ),
                ),
                if (!_collapsed.contains(section.label))
                  for (final item in section.items) _NavTile(entry: item, active: item.path == active, onTap: () => _go(item.path)),
              ],
            ],
          ),
        ),

        // Logout
        Container(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.black.withValues(alpha: 0.12)))),
          child: SafeArea(
            top: false,
            child: _NavTile(
              entry: const NavEntry('', 'Logout', Icons.logout),
              active: false,
              onTap: () => confirmLogout(context, ref),
            ),
          ),
        ),
      ]),
    );
  }
}

class _NavTile extends StatelessWidget {
  final NavEntry entry;
  final bool active;
  final VoidCallback onTap;
  const _NavTile({required this.entry, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: active ? Colors.black.withValues(alpha: 0.15) : Colors.transparent,
        child: InkWell(
          onTap: onTap,
          hoverColor: Colors.black.withValues(alpha: 0.1),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: active ? Colors.white : Colors.transparent, width: 4)),
            ),
            child: Row(children: [
              Icon(entry.icon, size: 18, color: Colors.white.withValues(alpha: active ? 1 : 0.9)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(entry.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: active ? 1 : 0.9),
                      fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                      fontSize: 13.5,
                    )),
              ),
            ]),
          ),
        ),
      );
}

// ── Gold header ─────────────────────────────────────────────────────────────

class _GoldHeader extends ConsumerWidget {
  final bool showMenu;
  const _GoldHeader({required this.showMenu});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final student = ref.watch(authControllerProvider).student;
    final name = student?.name ?? 'Student';
    return Material(
      color: AppColors.gold,
      elevation: 1,
      shadowColor: Colors.black26,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 60,
          child: Row(children: [
            const SizedBox(width: 4),
            if (showMenu)
              IconButton(
                tooltip: 'Menu',
                onPressed: () => Scaffold.of(context).openDrawer(),
                icon: const Icon(Icons.menu, color: Colors.white),
              ),
            const SizedBox(width: 4),
            Expanded(child: _SearchPill(onTap: () => showPageSearch(context))),
            IconButton(
              tooltip: 'School calendar',
              onPressed: () => context.go('/calendar'),
              icon: const Icon(Icons.event_note_outlined, color: Colors.white),
            ),
            PopupMenuButton<String>(
              tooltip: 'Account',
              offset: const Offset(0, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
              color: Colors.white,
              onSelected: (v) {
                if (v == 'logout') {
                  confirmLogout(context, ref);
                } else {
                  context.go(v);
                }
              },
              itemBuilder: (_) => [
                PopupMenuItem<String>(
                  enabled: false,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate800)),
                    Text(student == null ? 'Student' : [student.registrationNo, student.className].where((e) => e.isNotEmpty).join(' · '), style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
                  ]),
                ),
                const PopupMenuDivider(),
                _menuItem('/profile', Icons.person_outline, 'Personal Profile', AppColors.slate700),
                _menuItem('/settings', Icons.settings_outlined, 'Settings', AppColors.slate700),
                _menuItem('logout', Icons.logout, 'Logout', AppColors.error),
              ],
              child: Padding(
                padding: const EdgeInsets.only(left: 4, right: 10),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2)),
                    child: InitialsAvatar(name: name, photoUrl: student?.photoUrl, radius: 16),
                  ),
                  if (MediaQuery.sizeOf(context).width >= 600) ...[
                    const SizedBox(width: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 160),
                      child: Text(name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5)),
                    ),
                  ],
                  const Icon(Icons.expand_more, color: Colors.white, size: 18),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  PopupMenuItem<String> _menuItem(String value, IconData icon, String label, Color color) => PopupMenuItem<String>(
        value: value,
        height: 40,
        child: Row(children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13.5)),
        ]),
      );
}

class _SearchPill extends StatelessWidget {
  final VoidCallback onTap;
  const _SearchPill({required this.onTap});
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.centerRight,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 260),
          child: Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radius),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              onTap: onTap,
              child: const SizedBox(
                height: 36,
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Row(children: [
                    Expanded(child: Text('Search...', style: TextStyle(color: AppColors.slate400, fontSize: 13.5))),
                    Icon(Icons.search, size: 18, color: AppColors.slate400),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
}

/// Quick "jump to page" search over the sidebar entries (the web header's
/// search box does the same for its nav links).
Future<void> showPageSearch(BuildContext context) async {
  final picked = await showDialog<String>(context: context, builder: (_) => const _PageSearchDialog());
  if (picked != null && context.mounted) context.go(picked);
}

class _PageSearchDialog extends StatefulWidget {
  const _PageSearchDialog();
  @override
  State<_PageSearchDialog> createState() => _PageSearchDialogState();
}

class _PageSearchDialogState extends State<_PageSearchDialog> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final results = [
      for (final s in portalNav)
        for (final e in s.items)
          if (_q.isEmpty || e.label.toLowerCase().contains(_q) || s.label.toLowerCase().contains(_q)) (s.label, e),
    ];
    return Dialog(
      alignment: Alignment.topCenter,
      insetPadding: const EdgeInsets.fromLTRB(16, 72, 16, 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 460),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Search pages…', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
            ),
          ),
          const Divider(),
          Flexible(
            child: results.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('No matching pages.', style: TextStyle(color: AppColors.slate500)),
                  )
                : ListView(shrinkWrap: true, padding: const EdgeInsets.symmetric(vertical: 4), children: [
                    for (final (group, e) in results)
                      ListTile(
                        dense: true,
                        leading: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radius)),
                          child: Icon(e.icon, size: 17, color: AppColors.accent),
                        ),
                        title: Text(e.label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate800)),
                        subtitle: Text(group, style: const TextStyle(fontSize: 11.5, color: AppColors.slate500)),
                        onTap: () => Navigator.of(context).pop(e.path),
                      ),
                  ]),
          ),
        ]),
      ),
    );
  }
}

Future<void> confirmLogout(BuildContext context, WidgetRef ref) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Log out?'),
      content: const Text('You will need your School ID and password to sign in again.',
          style: TextStyle(color: AppColors.slate600)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          style: TextButton.styleFrom(foregroundColor: AppColors.error),
          child: const Text('Logout'),
        ),
      ],
    ),
  );
  if (ok != true) return;
  await ref.read(authControllerProvider.notifier).logout();
  if (context.mounted) context.go('/login');
}
