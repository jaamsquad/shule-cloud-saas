import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Record positive/negative behaviour. NOTE: the backend's behaviour endpoints
/// (/behaviour-traits, /observations, /behaviour-ratings) have no per-teacher
/// JWT scoping today — only the tenancy header applies. This screen therefore
/// only lets a teacher pick from their OWN class list (myClassesProvider) and
/// record observations against it; the server-side ownership check that
/// exists for attendance/marks doesn't exist here yet.
class BehaviourScreen extends ConsumerStatefulWidget {
  const BehaviourScreen({super.key});
  @override
  ConsumerState<BehaviourScreen> createState() => _BehaviourScreenState();
}

class _BehaviourScreenState extends ConsumerState<BehaviourScreen> {
  String _kind = 'Positive';
  final _studentCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() { _studentCtrl.dispose(); _noteCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final classes = ref.watch(myClassesProvider);
    return PortalPage(
      title: 'Behaviour',
      subtitle: 'Record positive or negative observations',
      bottomBar: FilledButton.icon(
        onPressed: _saving ? null : _save,
        icon: _saving
            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.save_outlined, size: 18),
        label: const Text('Save & Notify Parent'),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
        PanelCard(
          title: 'Record behaviour',
          icon: Icons.psychology_alt_outlined,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: _kindChip('Positive', Icons.thumb_up_outlined, AppColors.green)),
              const SizedBox(width: 10),
              Expanded(child: _kindChip('Negative', Icons.thumb_down_outlined, AppColors.error)),
            ]),
            const SizedBox(height: 14),
            const FieldLabel('Class'),
            classes.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
              data: (list) => DropdownButtonFormField<String>(
                isExpanded: true,
                decoration: const InputDecoration(hintText: 'Select class', prefixIcon: Icon(Icons.groups_outlined)),
                items: [for (final c in {for (final c in list) c.className}) DropdownMenuItem(value: c, child: Text(c))],
                onChanged: (_) {},
              ),
            ),
            const SizedBox(height: 14),
            const FieldLabel('Student'),
            TextField(controller: _studentCtrl, decoration: const InputDecoration(hintText: 'Name or admission no.', prefixIcon: Icon(Icons.person_search_outlined))),
            const SizedBox(height: 14),
            const FieldLabel('Observation Note'),
            TextField(controller: _noteCtrl, maxLines: 4, decoration: const InputDecoration(hintText: 'What happened?')),
            const SizedBox(height: 14),
            OutlinedButton.icon(onPressed: null, icon: const Icon(Icons.attach_file), label: const Text('Attach Photo/Document (coming soon)')),
          ]),
        ),
      ]),
    );
  }

  Widget _kindChip(String label, IconData icon, Color color) {
    final selected = _kind == label;
    return GestureDetector(
      onTap: () => setState(() => _kind = label),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.1) : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radius),
          border: Border.all(color: selected ? color : AppColors.slate200, width: 1.5),
        ),
        child: Column(children: [
          Icon(icon, color: selected ? color : AppColors.onSurfaceVariant),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: selected ? color : AppColors.onSurfaceVariant, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }

  Future<void> _save() async {
    if (_studentCtrl.text.trim().isEmpty || _noteCtrl.text.trim().isEmpty) {
      showToast(context, 'Enter the student and a note.', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(dataRepoProvider).recordObservations([
        {'studentRef': _studentCtrl.text.trim(), 'type': _kind, 'note': _noteCtrl.text.trim()},
      ]);
      if (mounted) {
        showToast(context, 'Behaviour recorded.');
        _studentCtrl.clear(); _noteCtrl.clear();
      }
    } catch (e) {
      if (mounted) showToast(context, 'Could not save: $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
