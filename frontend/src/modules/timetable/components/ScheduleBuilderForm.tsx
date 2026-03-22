import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TimetableEntry } from '../types';
import { Clock, CalendarDays, MapPin, User, BookOpen, Layers, Type, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScheduleBuilderFormProps {
  onSubmit: (entry: Omit<TimetableEntry, 'id'>) => Promise<void> | void;
}

const ScheduleBuilderForm: React.FC<ScheduleBuilderFormProps> = ({ onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    className: '',
    stream: '',
    subject: '',
    teacher: '',
    room: '',
    day: '',
    startTime: '',
    endTime: '',
    lessonType: 'Regular' as TimetableEntry['lessonType'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setForm({
        className: '',
        stream: '',
        subject: '',
        teacher: '',
        room: '',
        day: '',
        startTime: '',
        endTime: '',
        lessonType: 'Regular',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const lessonTypes = ['Regular', 'Practical', 'Remedial', 'Exam'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="className" className="text-slate-600 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Class / Grade
            </Label>
            <Input
              id="className"
              placeholder="e.g. Grade 10"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              required
              className="bg-slate-50 focus-visible:ring-indigo-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stream" className="text-slate-600 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> Stream / Section
            </Label>
            <Input
              id="stream"
              placeholder="e.g. Science A"
              value={form.stream}
              onChange={(e) => setForm({ ...form, stream: e.target.value })}
              className="bg-slate-50 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-slate-600 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Subject
            </Label>
            <Input
              id="subject"
              placeholder="e.g. Advanced Mathematics"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
              className="bg-slate-50 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonType" className="text-slate-600 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-500" /> Lesson Type
            </Label>
            <Select 
              value={form.lessonType} 
              onValueChange={(value: any) => setForm({ ...form, lessonType: value })}
            >
              <SelectTrigger className="bg-slate-50 focus:ring-indigo-500">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {lessonTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule & Allocation */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher" className="text-slate-600 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-500" /> Teacher
            </Label>
            <Input
              id="teacher"
              placeholder="e.g. Mr. Anderson"
              value={form.teacher}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              required
              className="bg-slate-50 focus-visible:ring-teal-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room" className="text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-500" /> Room Location
            </Label>
            <Input
              id="room"
              placeholder="e.g. Lab 4B"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              required
              className="bg-slate-50 focus-visible:ring-teal-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="day" className="text-slate-600 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-500" /> Day of Week
            </Label>
            <Select 
              value={form.day} 
              onValueChange={(value) => setForm({ ...form, day: value })}
              required
            >
              <SelectTrigger className="bg-slate-50 focus:ring-teal-500">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {days.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" /> Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
                className="bg-slate-50 focus-visible:ring-teal-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" /> End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
                className="bg-slate-50 focus-visible:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="pt-4"
      >
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 shadow-lg shadow-indigo-500/30 transition-all rounded-xl border-0"
        >
          {isSubmitting ? 'Adding to Schedule...' : 'Add Schedule Entry'}
        </Button>
      </motion.div>
    </form>
  );
};

export default ScheduleBuilderForm;