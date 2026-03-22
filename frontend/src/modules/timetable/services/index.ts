import { TimetableEntry, ExamTimetableEntry, Conflict, Substitution, TimetableSettings } from '../types';
import { mockTimetableEntries, mockExamTimetableEntries, mockConflicts, mockSubstitutions, mockTimetableSettings } from '../data';

export const getTimetableEntries = async (filters?: { className?: string; teacher?: string; day?: string }): Promise<TimetableEntry[]> => {
  // Placeholder: simulate API call with filters
  return new Promise(resolve => {
    setTimeout(() => {
      let filtered = mockTimetableEntries;
      if (filters?.className) filtered = filtered.filter(e => e.className === filters.className);
      if (filters?.teacher) filtered = filtered.filter(e => e.teacher === filters.teacher);
      if (filters?.day) filtered = filtered.filter(e => e.day === filters.day);
      resolve(filtered);
    }, 500);
  });
};

export const getExamTimetableEntries = async (): Promise<ExamTimetableEntry[]> => {
  // Placeholder: simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockExamTimetableEntries), 500));
};

export const getConflicts = async (): Promise<Conflict[]> => {
  // Placeholder: simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockConflicts), 500));
};

export const getSubstitutions = async (): Promise<Substitution[]> => {
  // Placeholder: simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockSubstitutions), 500));
};

export const getTimetableSettings = async (): Promise<TimetableSettings> => {
  // Placeholder: simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockTimetableSettings), 500));
};

export const createTimetableEntry = async (entry: Omit<TimetableEntry, 'id'>): Promise<TimetableEntry> => {
  // Placeholder: simulate create
  return new Promise(resolve => setTimeout(() => resolve({ ...entry, id: Date.now().toString() }), 500));
};

export const updateTimetableEntry = async (id: string, entry: Partial<TimetableEntry>): Promise<TimetableEntry> => {
  // Placeholder: simulate update
  return new Promise(resolve => setTimeout(() => resolve({ ...mockTimetableEntries[0], ...entry, id }), 500));
};

export const deleteTimetableEntry = async (id: string): Promise<void> => {
  // Placeholder: simulate delete
  return new Promise(resolve => setTimeout(() => {}, 500));
};

export const createSubstitution = async (sub: Omit<Substitution, 'id'>): Promise<Substitution> => {
  // Placeholder: simulate create
  return new Promise(resolve => setTimeout(() => resolve({ ...sub, id: Date.now().toString() }), 500));
};

export const updateSettings = async (settings: TimetableSettings): Promise<TimetableSettings> => {
  // Placeholder: simulate update
  return new Promise(resolve => setTimeout(() => resolve(settings), 500));
};