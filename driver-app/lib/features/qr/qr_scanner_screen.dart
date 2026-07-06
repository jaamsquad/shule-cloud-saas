import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme/app_theme.dart';
import '../../models/student.dart';
import '../../providers/data_providers.dart';
import '../../providers/providers.dart';

/// Student card scanner. Three modes:
///   'board'  — scan → immediately Board the student (rules enforced)
///   'drop'   — scan → immediately Drop the student
///   'lookup' — scan → show the student with Board/Drop buttons
class QrScannerScreen extends ConsumerStatefulWidget {
  final String mode;
  const QrScannerScreen({super.key, this.mode = 'lookup'});
  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handling = false;
  Student? _result;
  String? _lastAction; // e.g. "Boarded ✓ — Jane Doe"
  bool _lastError = false;

  bool get _isBoard => widget.mode == 'board';
  bool get _isDrop => widget.mode == 'drop';
  bool get _autoAct => _isBoard || _isDrop;

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
      if (_autoAct) {
        // Apply the action immediately through the controller (enforces the
        // boarded/dropped rules and updates the shared list).
        await _applyThroughController(student, board: _isBoard);
        // Keep scanning the next card after a short beat.
        await Future.delayed(const Duration(milliseconds: 900));
        if (mounted) setState(() => _handling = false);
      } else {
        setState(() => _result = student);
      }
    } catch (e) {
      setState(() {
        _lastAction = e.toString().replaceFirst('Exception: ', '');
        _lastError = true;
        _handling = false;
      });
    }
  }

  // Ensure the student exists in the shared controller list, then board/drop.
  Future<void> _applyThroughController(Student s, {required bool board}) async {
    final ctrl = ref.read(studentsControllerProvider.notifier);
    try {
      if (board) {
        await ctrl.board(s.id);
      } else {
        await ctrl.drop(s.id);
      }
      setState(() { _lastAction = '${board ? "Boarded" : "Dropped"} ✓ — ${s.name}'; _lastError = false; });
    } on BoardingRuleError catch (e) {
      setState(() { _lastAction = '${s.name}: ${e.message}'; _lastError = true; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _isBoard ? 'Scan to Board' : _isDrop ? 'Scan to Drop' : 'Scan Student';
    final accent = _isDrop ? AppColors.accentBlue : AppColors.primary;
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
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
                  decoration: BoxDecoration(border: Border.all(color: accent, width: 3), borderRadius: BorderRadius.circular(16)),
                ),
                Positioned(
                  bottom: 40,
                  child: Chip(
                    avatar: Icon(_isBoard ? Icons.check : _isDrop ? Icons.logout : Icons.qr_code, size: 18),
                    label: Text(_autoAct ? 'Scan a card to ${_isBoard ? "board" : "drop"}' : 'Align the QR / barcode'),
                  ),
                ),
                // Last action toast (board/drop mode).
                if (_autoAct && _lastAction != null)
                  Positioned(
                    top: 20,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: _lastError ? AppColors.danger : accent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(_lastAction!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ),
          if (!_autoAct && _result != null) _resultCard(_result!),
        ],
      ),
    );
  }

  Widget _resultCard(Student s) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const CircleAvatar(backgroundColor: AppColors.primary, child: Icon(Icons.person, color: Colors.white)),
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
              Expanded(child: FilledButton(onPressed: () => _finish(s, board: true), child: const Text('Board'))),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.accentBlue),
                  onPressed: () => _finish(s, board: false),
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

  Future<void> _finish(Student s, {required bool board}) async {
    await _applyThroughController(s, board: board);
    if (mounted && _lastAction != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_lastAction!),
        backgroundColor: _lastError ? AppColors.danger : null,
      ));
    }
    setState(() { _result = null; _handling = false; });
  }
}
