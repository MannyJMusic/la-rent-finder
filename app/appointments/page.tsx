import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppointmentsClient from '@/components/appointments/AppointmentsClient';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return <AppointmentsClient />;
}
