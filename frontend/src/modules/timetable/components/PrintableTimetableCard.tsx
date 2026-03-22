import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, AlertCircle } from 'lucide-react';
import { TimetableEntry } from '../types';

interface PrintableTimetableCardProps {
  entries: TimetableEntry[];
  title: string;
  showLessonType?: boolean;
}

const PrintableTimetableCard: React.FC<PrintableTimetableCardProps> = ({ 
  entries, 
  title,
  showLessonType = false 
}) => {
  const handlePrint = () => {
    window.print();
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

  // Generate unique times from entries or use defaults
  const uniqueTimes = useMemo(() => {
    if (entries.length === 0) return times;
    const entryTimes = Array.from(new Set(entries.map(e => e.startTime))).sort();
    return entryTimes.length > 0 ? entryTimes : times;
  }, [entries]);

  // Handle empty entries gracefully
  if (entries.length === 0) {
    return (
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:text-center">
          <CardTitle>{title}</CardTitle>
          <Button onClick={handlePrint} className="print:hidden" variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-gray-500">
            <AlertCircle className="mr-2 h-5 w-5" />
            No timetable entries to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:shadow-none print:border-none">
      <CardHeader className="print:text-center print:page-break-after-avoid">
        <CardTitle className="print:mb-2">{title}</CardTitle>
        <div className="print:hidden">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print Timetable
          </Button>
        </div>
      </CardHeader>
      <CardContent className="print:p-0">
        <div className="overflow-x-auto print:overflow-visible">
          <table 
            className="w-full border-collapse border border-gray-300 text-sm print:text-xs print:page-break-inside-avoid"
            role="table"
            aria-label={`${title} timetable`}
          >
            <thead>
              <tr className="print:page-break-inside-avoid">
                <th 
                  className="border border-gray-300 p-2 bg-gray-100 font-semibold text-left"
                  scope="col"
                >
                  Time
                </th>
                {days.map(day => (
                  <th 
                    key={day} 
                    className="border border-gray-300 p-2 bg-gray-100 font-semibold text-left"
                    scope="col"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map(time => (
                <tr key={time} className="print:page-break-inside-avoid hover:bg-gray-50 print:hover:bg-white">
                  <td className="border border-gray-300 p-2 font-medium whitespace-nowrap">
                    {time}
                  </td>
                  {days.map(day => {
                    const entry = entries.find(
                      e => e.day === day && e.startTime === time
                    );
                    return (
                      <td 
                        key={`${day}-${time}`} 
                        className="border border-gray-300 p-2 text-xs align-top"
                      >
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900">
                              {entry.subject}
                            </div>
                            <div className="text-gray-700">
                              {entry.teacher}
                            </div>
                            <div className="text-gray-600">
                              {entry.room}
                            </div>
                            {showLessonType && (
                              <div className="text-gray-500 italic">
                                {entry.lessonType}
                              </div>
                            )}
                            {entry.stream && (
                              <div className="text-gray-500">
                                Stream {entry.stream}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 print:mt-2 text-xs text-gray-600 print:block hidden">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintableTimetableCard;