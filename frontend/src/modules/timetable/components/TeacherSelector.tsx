import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TeacherSelectorProps {
  value: string;
  onChange: (value: string) => void;
  teachers: string[];
}

const TeacherSelector: React.FC<TeacherSelectorProps> = ({ value, onChange, teachers }) => (
  <div>
    <Label htmlFor="teacher-select">Select Teacher</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="teacher-select">
        <SelectValue placeholder="Choose a teacher" />
      </SelectTrigger>
      <SelectContent>
        {teachers.map(teacher => (
          <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default TeacherSelector;