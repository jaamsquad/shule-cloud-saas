import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog.dart';
import '../../core/prefs.dart';
import '../../core/theme.dart';

/// App tile: icon, name, what's inside, and a star for Quick Access.
class AppCard extends ConsumerWidget {
  final AppDef app;
  const AppCard({super.key, required this.app});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final starred = ref.watch(appListsProvider).starred.contains(app.key);
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: C.slate200)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          if (app.locked) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('This app is not in your school\'s plan. Contact ShuleCloud on 0726151104.')));
            return;
          }
          context.go('/apps/${app.key}');
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 38, height: 38, decoration: BoxDecoration(color: app.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(app.icon, color: app.color, size: 20)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text(app.name, style: const TextStyle(fontWeight: FontWeight.w700, color: C.ink, fontSize: 14.5))),
                  if (app.locked) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.lock, size: 13, color: C.amber)),
                ]),
                const SizedBox(height: 3),
                Text(app.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.slate500, fontSize: 12.5, height: 1.3)),
              ]),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              tooltip: starred ? 'Remove from Quick Access' : 'Add to Quick Access',
              icon: Icon(starred ? Icons.star_rounded : Icons.star_outline_rounded, color: starred ? const Color(0xFFF59E0B) : C.slate400, size: 22),
              onPressed: () => ref.read(appListsProvider.notifier).toggleStar(app.key),
            ),
          ]),
        ),
      ),
    );
  }
}
