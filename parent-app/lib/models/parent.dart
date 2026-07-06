/// The authenticated parent/guardian.
class Parent {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? photoUrl;

  const Parent({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.photoUrl,
  });

  factory Parent.fromJson(Map<String, dynamic> j) => Parent(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['parentName'] ?? j['name'] ?? 'Parent').toString(),
        email: j['email']?.toString(),
        phone: j['phone']?.toString(),
        photoUrl: (j['photoUrl'] ?? j['photo'])?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id, 'name': name, 'email': email, 'phone': phone, 'photoUrl': photoUrl,
      };
}
