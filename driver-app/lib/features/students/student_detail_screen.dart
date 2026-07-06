import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';
import '../../widgets/app_widgets.dart';

/// Student detail: photo, medical alert, guardian, route, board/drop actions.
class StudentDetailScreen extends ConsumerWidget {
  final String studentId;
  const StudentDetailScreen({super.key, required this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final students = ref.watch(studentsControllerProvider).valueOrNull ?? [];
    final ctrl = ref.read(studentsControllerProvider.notifier);
    final student = students.where((s) => s.id == studentId).firstOrNull;

    if (student == null) {
      return const Scaffold(body: Center(child: Text('Student not found')));
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(student.name, style: const TextStyle(fontWeight: FontWeight.w800)),
              background: student.photoUrl != null
                  ? CachedNetworkImage(imageUrl: student.photoUrl!, fit: BoxFit.cover)
                  : Container(color: AppColors.primary, child: const Icon(Icons.person, size: 96, color: Colors.white)),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Text('${student.className} • Admission #${student.admissionNo}', style: const TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 16),
                if (student.medicalAlert != null)
                  AppCard(
                    color: const Color(0xFFFDECEC),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: AppColors.danger),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('MEDICAL ALERT', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w800, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text(student.medicalAlert!, style: const TextStyle(fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PARENT / GUARDIAN', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text(student.parentName ?? '—', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      if (student.parentPhone != null) Text(student.parentPhone!, style: const TextStyle(color: AppColors.textMuted)),
                      if (student.parentPhone != null) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _call(student.parentPhone!),
                                icon: const Icon(Icons.call, size: 18),
                                label: const Text('Call Parent'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _messageParent(context, ref, student),
                                icon: const Icon(Icons.sms, size: 18),
                                label: const Text('Send SMS'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ROUTE INFORMATION', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 12)),
                      const SizedBox(height: 8),
                      _routeRow(Icons.location_on, 'Pickup Stop', student.pickupStop, AppColors.primary),
                      const SizedBox(height: 8),
                      _routeRow(Icons.flag, 'Drop Stop', student.dropStop, AppColors.accentBlue),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => ctrl.board(student.id),
                        icon: const Icon(Icons.check),
                        label: const Text('Mark Boarded'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.accentBlue),
                        onPressed: () => ctrl.drop(student.id),
                        icon: const Icon(Icons.logout),
                        label: const Text('Mark Dropped'),
                      ),
                    ),
                  ],
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  // Open the phone dialer with the parent's number.
  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(' ', ''));
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  // Compose an SMS to the parent through the school gateway (logged for admin).
  Future<void> _messageParent(BuildContext context, WidgetRef ref, Student student) async {
    final controller = TextEditingController();
    final send = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Message ${student.parentName ?? "parent"}'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 300,
          decoration: const InputDecoration(hintText: 'Type your message…'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
        ],
      ),
    );
    if (send != true || controller.text.trim().isEmpty) return;
    try {
      await ref.read(studentRepoProvider).messageParent(student.id, controller.text.trim());
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message sent to parent')));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${e.toString()}')));
      }
    }
  }

  Widget _routeRow(IconData icon, String label, String value, Color color) => Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      );
}
