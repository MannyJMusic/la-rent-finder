'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Appointment {
  id: string;
  listing_title: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  address: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pending' },
  confirmed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Confirmed' },
  cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Completed' },
};

const statusDotColor: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-emerald-400',
  cancelled: 'bg-red-400',
  completed: 'bg-blue-400',
};

export default function CalendarView({ appointments }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goPrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const goNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; date: string }> = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, isCurrentMonth: false, date: dateStr });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, isCurrentMonth: true, date: dateStr });
    }

    // Next month leading days to fill grid
    const remaining = 42 - days.length; // 6 rows * 7 cols
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month + 2;
      const dateStr = `${year}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, isCurrentMonth: false, date: dateStr });
    }

    return days;
  }, [year, month]);

  // Map appointments by date for quick lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const dateKey = apt.scheduled_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(apt);
    }
    return map;
  }, [appointments]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goPrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((cell, index) => {
          const dayAppointments = appointmentsByDate.get(cell.date) || [];
          const isToday = cell.date === todayStr && cell.isCurrentMonth;

          return (
            <div
              key={index}
              className={cn(
                'relative min-h-[80px] border-b border-r p-1.5 transition-colors',
                cell.isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                index % 7 === 6 && 'border-r-0'
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : cell.isCurrentMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/50'
                )}
              >
                {cell.day}
              </span>

              {/* Appointment dots */}
              <div className="mt-0.5 space-y-0.5">
                {dayAppointments.slice(0, 3).map((apt) => {
                  const dotColor = statusDotColor[apt.status] || statusDotColor.pending;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={cn(
                        'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors hover:bg-zinc-700/50',
                        'truncate'
                      )}
                      title={apt.listing_title}
                    >
                      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColor)} />
                      <span className="truncate text-zinc-300">{apt.listing_title}</span>
                    </button>
                  );
                })}
                {dayAppointments.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{dayAppointments.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected appointment detail overlay */}
      <AnimatePresence>
        {selectedAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="border-t p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{selectedAppointment.listing_title}</h4>
                  <Badge
                    className={
                      (statusConfig[selectedAppointment.status] || statusConfig.pending).color
                    }
                  >
                    {(statusConfig[selectedAppointment.status] || statusConfig.pending).label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {selectedAppointment.scheduled_date} at {selectedAppointment.scheduled_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selectedAppointment.address}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAppointment(null)}
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
