// GENERATED-STYLE Hive adapter for GpsPoint.
//
// This is hand-written so the project compiles out of the box. If you change the
// fields on GpsPoint, either update this file or regenerate it with:
//   flutter pub run build_runner build --delete-conflicting-outputs
part of 'gps_point.dart';

class GpsPointAdapter extends TypeAdapter<GpsPoint> {
  @override
  final int typeId = 1;

  @override
  GpsPoint read(BinaryReader reader) {
    final n = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < n; i++) reader.readByte(): reader.read(),
    };
    return GpsPoint(
      latitude: fields[0] as double,
      longitude: fields[1] as double,
      speed: fields[2] as double,
      heading: fields[3] as double,
      accuracy: fields[4] as double,
      altitude: fields[5] as double,
      timestamp: fields[6] as int,
      battery: fields[7] as int,
      driverId: fields[8] as String,
      busId: fields[9] as String,
      tripId: fields[10] as String,
    );
  }

  @override
  void write(BinaryWriter writer, GpsPoint obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.latitude)
      ..writeByte(1)
      ..write(obj.longitude)
      ..writeByte(2)
      ..write(obj.speed)
      ..writeByte(3)
      ..write(obj.heading)
      ..writeByte(4)
      ..write(obj.accuracy)
      ..writeByte(5)
      ..write(obj.altitude)
      ..writeByte(6)
      ..write(obj.timestamp)
      ..writeByte(7)
      ..write(obj.battery)
      ..writeByte(8)
      ..write(obj.driverId)
      ..writeByte(9)
      ..write(obj.busId)
      ..writeByte(10)
      ..write(obj.tripId);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) => identical(this, other) || other is GpsPointAdapter && runtimeType == other.runtimeType && typeId == other.typeId;
}
