import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/providers.dart';

/// Incident report: type, description, photo, auto GPS → upload to backend.
class IncidentScreen extends ConsumerStatefulWidget {
  const IncidentScreen({super.key});
  @override
  ConsumerState<IncidentScreen> createState() => _IncidentScreenState();
}

class _IncidentScreenState extends ConsumerState<IncidentScreen> {
  final _desc = TextEditingController();
  String? _type;
  File? _photo;
  double? _lat, _lng;
  bool _submitting = false;

  static const _types = ['Breakdown', 'Accident', 'Behaviour', 'Road Block', 'Medical', 'Other'];

  @override
  void initState() {
    super.initState();
    _captureLocation();
  }

  Future<void> _captureLocation() async {
    try {
      final loc = ref.read(locationServiceProvider);
      if (await loc.ensurePermissions()) {
        final p = await loc.current();
        setState(() { _lat = p.latitude; _lng = p.longitude; });
      }
    } catch (_) {/* GPS optional for report */}
  }

  Future<void> _pickPhoto() async {
    final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 60);
    if (x != null) setState(() => _photo = File(x.path));
  }

  Future<void> _submit() async {
    if (_type == null || _desc.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a type and describe the incident')));
      return;
    }
    setState(() => _submitting = true);
    try {
      String? photoB64;
      if (_photo != null) photoB64 = base64Encode(await _photo!.readAsBytes());
      await ref.read(safetyRepoProvider).reportIncident(
            type: _type!,
            description: _desc.text.trim(),
            lat: _lat,
            lng: _lng,
            photoBase64: photoB64,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Incident submitted')));
      context.pop();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not submit — try again')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Incident Report')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Please provide accurate details for safety records.', style: TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 16),
          const Text('Incident Type', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _type,
            hint: const Text('Select category…'),
            items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
            onChanged: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: 16),
          const Text('Description', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(controller: _desc, maxLines: 5, decoration: const InputDecoration(hintText: 'Describe what happened in detail…')),
          const SizedBox(height: 16),
          const Text('Evidence Photo', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(
            children: [
              GestureDetector(
                onTap: _pickPhoto,
                child: Container(
                  width: 120,
                  height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [Icon(Icons.add_a_photo_outlined), SizedBox(height: 6), Text('Add Photo')],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              if (_photo != null)
                ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_photo!, width: 120, height: 100, fit: BoxFit.cover)),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.accentBlue.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: AppColors.accentBlue),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Current GPS Location', style: TextStyle(color: AppColors.accentBlue, fontWeight: FontWeight.w700)),
                      Text(_lat == null ? 'Capturing…' : '${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send),
            label: const Text('Submit Report'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => context.pop(), child: const Text('Cancel')),
        ],
      ),
    );
  }
}
