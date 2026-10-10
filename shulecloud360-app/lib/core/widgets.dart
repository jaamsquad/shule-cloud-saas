import 'package:flutter/material.dart';
import 'theme.dart';

/// White card with a soft border — the web app's panel look.
class Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: C.slate200)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      );
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  const SectionTitle(this.title, {super.key, this.subtitle, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 6, 2, 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: C.ink)),
              if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(subtitle!, style: const TextStyle(fontSize: 13, color: C.slate500))),
            ]),
          ),
          if (trailing != null) trailing!,
        ]),
      );
}

class StatTile extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  final String? hint;
  const StatTile({super.key, required this.label, required this.value, required this.icon, this.color = C.brand, this.hint});
  @override
  Widget build(BuildContext context) => Panel(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 20)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label.toUpperCase(), style: const TextStyle(fontSize: 10.5, letterSpacing: 0.6, fontWeight: FontWeight.w700, color: C.slate400)),
              const SizedBox(height: 2),
              FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: C.ink))),
              if (hint != null) Text(hint!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: C.slate500)),
            ]),
          ),
        ]),
      );
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? hint;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, this.hint, this.action});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 54, height: 54, decoration: BoxDecoration(color: C.slate100, borderRadius: BorderRadius.circular(16)), child: Icon(icon, color: C.slate400)),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, color: C.slate800)),
          if (hint != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(hint!, textAlign: TextAlign.center, style: const TextStyle(color: C.slate500, fontSize: 13))),
          if (action != null) Padding(padding: const EdgeInsets.only(top: 14), child: action!),
        ]),
      );
}

String money(num? n) {
  final v = (n ?? 0).round();
  final s = v.abs().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
  return '${v < 0 ? '-' : ''}KSh $s';
}

Color statusColor(String s) {
  switch (s.toUpperCase()) {
    case 'PAID': return C.green;
    case 'PARTIAL': return C.amber;
    case 'OVERDUE': return C.red;
    case 'VOIDED': case 'WAIVED': return C.slate400;
    default: return const Color(0xFF0284C7);
  }
}

class Badge2 extends StatelessWidget {
  final String text;
  final Color color;
  const Badge2(this.text, this.color, {super.key});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withValues(alpha: 0.25))),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      );
}
