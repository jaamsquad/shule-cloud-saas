/// Authenticated driver profile.
class Driver {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? photoUrl;
  final String busId;
  final String busPlate;
  final String routeId;
  final String routeName;

  const Driver({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.photoUrl,
    required this.busId,
    required this.busPlate,
    required this.routeId,
    required this.routeName,
  });

  factory Driver.fromJson(Map<String, dynamic> j) => Driver(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['name'] ?? 'Driver').toString(),
        email: j['email']?.toString(),
        phone: j['phone']?.toString(),
        photoUrl: (j['photoUrl'] ?? j['photo'])?.toString(),
        busId: (j['busId'] ?? '').toString(),
        busPlate: (j['busPlate'] ?? j['busNumber'] ?? 'Bus').toString(),
        routeId: (j['routeId'] ?? '').toString(),
        routeName: (j['routeName'] ?? 'Route').toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'photoUrl': photoUrl,
        'busId': busId,
        'busPlate': busPlate,
        'routeId': routeId,
        'routeName': routeName,
      };
}
