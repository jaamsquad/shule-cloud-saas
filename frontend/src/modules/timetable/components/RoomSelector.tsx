import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RoomSelectorProps {
  value: string;
  onChange: (value: string) => void;
  rooms: string[];
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ value, onChange, rooms }) => (
  <div>
    <Label htmlFor="room-select">Select Room</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="room-select">
        <SelectValue placeholder="Choose a room" />
      </SelectTrigger>
      <SelectContent>
        {rooms.map(room => (
          <SelectItem key={room} value={room}>{room}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default RoomSelector;