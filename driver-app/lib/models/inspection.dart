/// The pre-trip vehicle inspection checklist (spec items).
class InspectionItem {
  final String key;
  final String label;
  final bool checked;
  const InspectionItem({required this.key, required this.label, this.checked = false});

  InspectionItem copyWith({bool? checked}) =>
      InspectionItem(key: key, label: label, checked: checked ?? this.checked);
}

const kInspectionChecklist = <InspectionItem>[
  InspectionItem(key: 'brakes', label: 'Brakes'),
  InspectionItem(key: 'lights', label: 'Lights'),
  InspectionItem(key: 'tyres', label: 'Tyres'),
  InspectionItem(key: 'fuel', label: 'Fuel'),
  InspectionItem(key: 'mirrors', label: 'Mirrors'),
  InspectionItem(key: 'horn', label: 'Horn'),
  InspectionItem(key: 'fireExtinguisher', label: 'Fire Extinguisher'),
  InspectionItem(key: 'firstAid', label: 'First Aid Kit'),
];
