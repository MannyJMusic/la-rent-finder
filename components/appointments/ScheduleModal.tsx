'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScheduleListing {
  id: string;
  title: string;
  address: string;
  contact_name?: string;
  contact_email?: string;
}

interface ScheduleData {
  listing_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
}

interface ScheduleModalProps {
  listing: ScheduleListing;
  onClose: () => void;
  onSchedule: (data: ScheduleData) => void;
}

// Available time slots
const WEEKDAY_SLOTS = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
const WEEKEND_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export default function ScheduleModal({ listing, onClose, onSchedule }: ScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  // Build the mini calendar grid for date selection
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; isSelectable: boolean }> = [];

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, dateStr: '', isSelectable: false });
    }

    // Month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // Only allow future dates
      const isSelectable = date >= today;
      days.push({ day: d, dateStr, isSelectable });
    }

    return days;
  }, [year, month, today]);

  // Determine available time slots for the selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    // Weekend: Saturday (6) or Sunday (0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
  }, [selectedDate]);

  // Reset time selection when date changes
  const handleDateSelect = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setSubmitError(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build the ISO datetime for the API
      const scheduledDateTime = `${selectedDate}T${selectedTime}:00`;

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          apartment_id: listing.id,
          scheduled_time: scheduledDateTime,
          notes: notes || `Viewing request for ${listing.title}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to schedule appointment');
      }

      setSubmitSuccess(true);

      // Notify parent
      onSchedule({
        listing_id: listing.id,
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
        notes,
      });

      // Auto-close after brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-lg border bg-card shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Schedule a Viewing</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a date and time to visit
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Listing info summary */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <h3 className="font-semibold text-sm">{listing.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{listing.address}</span>
              </div>
              {listing.contact_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{listing.contact_name}</span>
                </div>
              )}
              {listing.contact_email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{listing.contact_email}</span>
                </div>
              )}
            </div>

            {/* Date picker - mini calendar */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Select Date</span>
              </div>

              <div className="rounded-lg border p-3">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{monthLabel}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map((name) => (
                    <div
                      key={name}
                      className="text-center text-[10px] font-medium text-muted-foreground py-1"
                    >
                      {name}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((cell, i) => {
                    if (cell.day === 0) {
                      return <div key={`empty-${i}`} />;
                    }

                    const isSelected = cell.dateStr === selectedDate;
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const isToday = cell.dateStr === todayStr;

                    return (
                      <button
                        key={cell.dateStr}
                        disabled={!cell.isSelectable}
                        onClick={() => handleDateSelect(cell.dateStr)}
                        className={cn(
                          'h-8 w-full rounded text-xs font-medium transition-colors',
                          cell.isSelectable
                            ? 'hover:bg-primary/20 cursor-pointer'
                            : 'text-muted-foreground/30 cursor-not-allowed',
                          isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                          isToday && !isSelected && 'ring-1 ring-primary/50'
                        )}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time selection */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Select Time
                    {selectedDateFormatted && (
                      <span className="font-normal text-muted-foreground">
                        {' '}-- {selectedDateFormatted}
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => {
                        setSelectedTime(slot);
                        setSubmitError(null);
                      }}
                      className={cn(
                        'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        selectedTime === slot
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50 hover:bg-primary/10'
                      )}
                    >
                      {formatTimeSlot(slot)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Notes */}
            {selectedDate && selectedTime && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or questions..."
                  className="w-full"
                />
              </motion.div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success message */}
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 text-sm"
              >
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Viewing scheduled successfully!</span>
              </motion.div>
            )}
          </div>

          {/* Footer with submit */}
          <div className="border-t p-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTime || isSubmitting || submitSuccess}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Scheduled
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Viewing
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
