import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ClassSelectorProps {
  value: string;
  onChange: (value: string) => void;
  classes: string[];
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ value, onChange, classes }) => (
  <div>
    <Label htmlFor="class-select">Select Class</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="class-select">
        <SelectValue placeholder="Choose a class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map(cls => (
          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default ClassSelector;