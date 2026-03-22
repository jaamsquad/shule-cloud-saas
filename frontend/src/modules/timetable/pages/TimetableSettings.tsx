import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTimetableSettings, updateSettings } from '../services';
import { TimetableSettings } from '../types';

const TimetableSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<TimetableSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getTimetableSettings();
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (settings) {
      await updateSettings(settings);
      alert('Settings saved!');
    }
  };

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Timetable Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="startTime">School Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={settings.schoolStartTime}
              onChange={(e) => setSettings({ ...settings, schoolStartTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endTime">School End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={settings.schoolEndTime}
              onChange={(e) => setSettings({ ...settings, schoolEndTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="periods">Periods Per Day</Label>
            <Input
              id="periods"
              type="number"
              value={settings.periodsPerDay}
              onChange={(e) => setSettings({ ...settings, periodsPerDay: parseInt(e.target.value) })}
            />
          </div>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimetableSettingsPage;