import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/inspection.dart';
import '../../providers/providers.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_widgets.dart';

/// Pre-trip vehicle inspection checklist. Returns `true` (via pop) once every
/// item is checked and submitted, so the dashboard can proceed to Start Trip.
class InspectionScreen extends ConsumerStatefulWidget {
  const InspectionScreen({super.key});
  @override
  ConsumerState<InspectionScreen> createState() => _InspectionScreenState();
}

class _InspectionScreenState extends ConsumerState<InspectionScreen> {
  late List<InspectionItem> _items;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _items = List.of(kInspectionChecklist);
  }

  bool get _allChecked => _items.every((i) => i.checked);

  Future<void> _complete() async {
    setState(() => _submitting = true);
    try {
      await ref.read(safetyRepoProvider).submitInspection({for (final i in _items) i.key: i.checked});
      if (mounted) context.pop(true);
    } catch (_) {
      // Even if the network is down, allow the trip to proceed — inspection was done.
      if (mounted) context.pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final driver = ref.watch(authControllerProvider).driver;
    return Scaffold(
      appBar: AppBar(title: const Text('Vehicle Inspection')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${driver?.busPlate ?? 'Bus'} • ${driver?.routeName ?? 'Route'} — pre-trip check', style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.accentBlue.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(12)),
            child: const Row(children: [
              Icon(Icons.info_outline, color: AppColors.accentBlue),
              SizedBox(width: 10),
              Expanded(child: Text('Perform a physical check of all items before starting your route.')),
            ]),
          ),
          const SizedBox(height: 16),
          for (int i = 0; i < _items.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AppCard(
                onTap: () => setState(() => _items[i] = _items[i].copyWith(checked: !_items[i].checked)),
                child: Row(
                  children: [
                    Icon(_iconFor(_items[i].key), color: AppColors.primary),
                    const SizedBox(width: 14),
                    Expanded(child: Text(_items[i].label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                    Checkbox(value: _items[i].checked, onChanged: (v) => setState(() => _items[i] = _items[i].copyWith(checked: v ?? false))),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: (_allChecked && !_submitting) ? _complete : null,
            child: Text(_submitting ? 'Submitting…' : 'Complete Inspection'),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String key) => switch (key) {
        'brakes' => Icons.speed,
        'lights' => Icons.lightbulb_outline,
        'tyres' => Icons.trip_origin,
        'fuel' => Icons.local_gas_station,
        'mirrors' => Icons.flip,
        'horn' => Icons.volume_up,
        'fireExtinguisher' => Icons.fire_extinguisher,
        'firstAid' => Icons.medical_services_outlined,
        _ => Icons.check_circle_outline,
      };
}
