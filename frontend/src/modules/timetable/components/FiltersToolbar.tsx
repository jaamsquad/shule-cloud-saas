import React from 'react';
import { Button } from '@/components/ui/button';
import ClassSelector from './ClassSelector';
import TeacherSelector from './TeacherSelector';
import RoomSelector from './RoomSelector';

interface FiltersToolbarProps {
  filters: { className?: string; teacher?: string; room?: string };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  classes: string[];
  teachers: string[];
  rooms: string[];
}

const FiltersToolbar: React.FC<FiltersToolbarProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  classes,
  teachers,
  rooms,
}) => (
  <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
    <ClassSelector
      value={filters.className || ''}
      onChange={(value) => onFilterChange('className', value)}
      classes={classes}
    />
    <TeacherSelector
      value={filters.teacher || ''}
      onChange={(value) => onFilterChange('teacher', value)}
      teachers={teachers}
    />
    <RoomSelector
      value={filters.room || ''}
      onChange={(value) => onFilterChange('room', value)}
      rooms={rooms}
    />
    <Button onClick={onClearFilters} variant="outline">
      Clear Filters
    </Button>
  </div>
);

export default FiltersToolbar;