import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Substitution } from '../types';

interface SubstitutionFormProps {
  onSubmit: (sub: Omit<Substitution, 'id'>) => void;
}

const SubstitutionForm: React.FC<SubstitutionFormProps> = ({ onSubmit }) => {
  const [form, setForm] = useState({
    originalTeacher: '',
    replacementTeacher: '',
    date: '',
    period: '',
    subject: '',
    className: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      originalTeacher: '',
      replacementTeacher: '',
      date: '',
      period: '',
      subject: '',
      className: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Add Substitution</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="originalTeacher">Original Teacher</Label>
          <Input
            id="originalTeacher"
            value={form.originalTeacher}
            onChange={(e) => setForm({ ...form, originalTeacher: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="replacementTeacher">Replacement Teacher</Label>
          <Input
            id="replacementTeacher"
            value={form.replacementTeacher}
            onChange={(e) => setForm({ ...form, replacementTeacher: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="period">Period</Label>
          <Input
            id="period"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="className">Class</Label>
          <Input
            id="className"
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
            required
          />
        </div>
      </div>
      <Button type="submit">Add Substitution</Button>
    </form>
  );
};

export default SubstitutionForm;