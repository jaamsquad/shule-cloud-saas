import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme/app_theme.dart';
import '../providers/data_providers.dart';

/// Class · Subject selector (the web pages' class dropdown). Writes the pick
/// to [selectedClassSubjectProvider], which Attendance and Marks Entry read.
class ClassPickerField extends ConsumerWidget {
  const ClassPickerField({super.key});

  static String _key(String className, String subject) => '$className\u0000$subject';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sel = ref.watch(selectedClassSubjectProvider);
    final classes = ref.watch(myClassesProvider);
    return classes.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const Text('Could not load your classes.', style: TextStyle(color: AppColors.error)),
      data: (list) {
        final keys = {for (final c in list) _key(c.className, c.subject)};
        final current = _key(sel.className, sel.subject);
        return DropdownButtonFormField<String>(
          // Keyed on the selection so an outside change (e.g. from Class
          // detail) re-seeds the field.
          key: ValueKey(current),
          initialValue: keys.contains(current) ? current : null,
          isExpanded: true,
          decoration: const InputDecoration(hintText: 'Select class & subject', prefixIcon: Icon(Icons.groups_outlined)),
          items: [
            for (final c in list)
              DropdownMenuItem(
                value: _key(c.className, c.subject),
                child: Text(c.subject.isEmpty ? c.className : '${c.className} · ${c.subject}', overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (v) {
            if (v == null) return;
            final parts = v.split('\u0000');
            ref.read(selectedClassSubjectProvider.notifier).state = ClassSubjectSelection(className: parts[0], subject: parts[1]);
          },
        );
      },
    );
  }
}
