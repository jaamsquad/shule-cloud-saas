import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';

/// My Classes (native, teachers): the classes and subjects I teach.
final _classesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final r = await ref.read(apiProvider).get('/auth/staff-portal/my-classes');
  return List<Map<String, dynamic>>.from((r.data as List).map((e) => Map<String, dynamic>.from(e as Map)));
});

class TeacherClassesScreen extends ConsumerWidget {
  const TeacherClassesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_classesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My Classes')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(_classesProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [EmptyState(icon: Icons.wifi_off, title: errorText(e))]),
          data: (rows) => rows.isEmpty
              ? ListView(children: const [EmptyState(icon: Icons.class_outlined, title: 'No classes assigned yet', hint: 'Your school assigns classes and subjects to you.')])
              : ListView.separated(
                  padding: const EdgeInsets.all(16), itemCount: rows.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final r = rows[i];
                    return Panel(
                      padding: const EdgeInsets.all(14),
                      onTap: () => context.push(Uri(path: '/open', queryParameters: {'portal': 'staff', 'path': '/attendance', 'title': 'Attendance — ${r['className']}', 'web': '1'}).toString()),
                      child: Row(children: [
                        Container(width: 42, height: 42, decoration: BoxDecoration(color: const Color(0xFF0F7A8A).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.class_outlined, color: Color(0xFF0F7A8A))),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${r['className'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink)),
                          Text('${r['subjectName'] ?? 'Class'}', style: const TextStyle(color: C.slate500, fontSize: 12.5)),
                        ])),
                        Badge2('${r['studentCount'] ?? 0} learners', C.brand),
                      ]),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
