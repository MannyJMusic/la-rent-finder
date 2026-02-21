import { cn } from '@/lib/utils';
import { Calendar, Clock, MapPin, FileText, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Appointment {
  id: string;
  listing_title: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  address: string;
  notes?: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pending' },
  confirmed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Confirmed' },
  cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Completed' },
};

export default function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
}: AppointmentCardProps) {
  const status = statusConfig[appointment.status] || statusConfig.pending;
  const isActionable = appointment.status !== 'cancelled' && appointment.status !== 'completed';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg leading-snug">
            {appointment.listing_title}
          </CardTitle>
          <Badge className={cn('flex-shrink-0', status.color)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Details row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(appointment.scheduled_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              {formatTime(appointment.scheduled_time)}
              {appointment.duration_minutes > 0 && (
                <span className="text-muted-foreground/70">
                  {' '}({appointment.duration_minutes} min)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span>{appointment.address}</span>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2.5 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{appointment.notes}</span>
          </div>
        )}

        {/* Actions */}
        {isActionable && (onReschedule || onCancel) && (
          <div className="flex items-center justify-end gap-2 border-t pt-3">
            {onReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(appointment.id)}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Reschedule
              </Button>
            )}
            {onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(appointment.id)}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
