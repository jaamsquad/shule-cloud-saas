import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../providers/providers.dart';

/// QR scanner: scan a student card → load info → Board / Drop.
class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});
  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handling = false;
  Student? _result;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture cap) async {
    if (_handling) return;
    final code = cap.barcodes.firstOrNull?.rawValue;
    if (code == null) return;
    setState(() => _handling = true);
    try {
      final student = await ref.read(studentRepoProvider).byQr(code);
      setState(() => _result = student);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Card not recognised')));
      setState(() => _handling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Student QR'),
        actions: [IconButton(icon: const Icon(Icons.flash_on), onPressed: () => _controller.toggleTorch())],
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(controller: _controller, onDetect: _onDetect),
                Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(border: Border.all(color: AppColors.primary, width: 3), borderRadius: BorderRadius.circular(16)),
                ),
                const Positioned(
                  bottom: 40,
                  child: Chip(avatar: Icon(Icons.qr_code, size: 18), label: Text('Align the QR / barcode')),
                ),
              ],
            ),
          ),
          if (_result != null) _resultCard(_result!),
        ],
      ),
    );
  }

  Widget _resultCard(Student s) {
    final ctrl = ref.read(studentRepoProvider);
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const CircleAvatar(backgroundColor: AppColors.primary, child: Icon(Icons.check, color: Colors.white)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text('${s.className} • ${s.pickupStop}', style: const TextStyle(color: AppColors.textMuted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: FilledButton(onPressed: () => _finish(() => ctrl.board(s.id), 'Boarded'), child: const Text('Board'))),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.accentBlue),
                  onPressed: () => _finish(() => ctrl.drop(s.id), 'Dropped'),
                  child: const Text('Drop'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: () => setState(() { _result = null; _handling = false; }), child: const Text('Scan next')),
        ],
      ),
    );
  }

  Future<void> _finish(Future<void> Function() fn, String label) async {
    try {
      await fn();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label ✓')));
    } catch (_) {/* queued offline */}
    setState(() { _result = null; _handling = false; });
  }
}
