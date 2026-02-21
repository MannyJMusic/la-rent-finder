'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, DollarSign, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardHeader from '@/components/DashboardHeader';

interface AppointmentWithApartment {
  id: string;
  apartment_id: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  apartment?: {
    title: string;
    address: string;
    price: number;
  };
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pending' },
  confirmed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Confirmed' },
  cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Completed' },
};

export default function AppointmentsClient() {
  const [appointments, setAppointments] = useState<AppointmentWithApartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/appointments');
      if (!res.ok) {
        throw new Error('Failed to fetch appointments');
      }
      const data = await res.json();
      setAppointments(data.appointments ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancel = async (id: string) => {
    try {
      setCancellingId(id);
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to cancel appointment');
      }
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, status: 'cancelled' } : apt
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <DashboardHeader />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground mt-1">
              Manage your scheduled property viewings
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-lg border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">No Appointments</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You haven&apos;t scheduled any property viewings yet. Browse
                listings and click &quot;Schedule Viewing&quot; to book your first
                appointment.
              </p>
              <Button className="mt-6" asChild>
                <a href="/dashboard">Browse Listings</a>
              </Button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {appointments.map((apt, index) => {
                  const status = statusConfig[apt.status] ?? statusConfig.pending;
                  return (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">
                                {apt.apartment?.title ?? `Property ${apt.apartment_id.slice(0, 8)}`}
                              </CardTitle>
                              {apt.apartment?.address && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{apt.apartment.address}</span>
                                </div>
                              )}
                            </div>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(apt.scheduled_time)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime(apt.scheduled_time)}</span>
                            </div>
                            {apt.apartment?.price && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>${apt.apartment.price.toLocaleString()}/mo</span>
                              </div>
                            )}
                          </div>

                          {apt.notes && (
                            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                              {apt.notes}
                            </p>
                          )}

                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancel(apt.id)}
                                disabled={cancellingId === apt.id}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {cancellingId === apt.id ? 'Cancelling...' : 'Cancel'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
