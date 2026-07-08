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
    return Scaffold(
      appBar: AppBar(title: const Text('Behaviour')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const SectionHeader('Record Behaviour'),
        Row(children: [
          Expanded(child: _kindChip('Positive', Icons.thumb_up_outlined, AppColors.secondary)),
          const SizedBox(width: 8),
          Expanded(child: _kindChip('Negative', Icons.thumb_down_outlined, AppColors.error)),
        ]),
        const SizedBox(height: 12),
        classes.when(
          loading: () => const LinearProgressIndicator(),
          error: (_, __) => const SizedBox.shrink(),
          data: (list) => DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Class'),
            items: [for (final c in list) DropdownMenuItem(value: c.className, child: Text(c.className))],
            onChanged: (_) {},
          ),
        ),
        const SizedBox(height: 12),
        TextField(controller: _studentCtrl, decoration: const InputDecoration(labelText: 'Student Name / Admission No.')),
        const SizedBox(height: 12),
        TextField(controller: _noteCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Observation Note', alignLabelWithHint: true)),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.attach_file), label: const Text('Attach Photo/Document (coming soon)')),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save_outlined),
          label: const Text('Save & Notify Parent'),
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
        decoration: BoxDecoration(color: selected ? color.withValues(alpha: 0.16) : AppColors.surfaceContainer, borderRadius: BorderRadius.circular(12), border: Border.all(color: selected ? color : Colors.transparent, width: 1.5)),
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter the student and a note.'), backgroundColor: AppColors.error));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(dataRepoProvider).recordObservations([
        {'studentRef': _studentCtrl.text.trim(), 'type': _kind, 'note': _noteCtrl.text.trim()},
      ]);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Behaviour recorded.'), backgroundColor: AppColors.secondary));
        _studentCtrl.clear(); _noteCtrl.clear();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save: ${e.toString()}'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
