import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PropertyDetailPageClient from './PropertyDetailPageClient';

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return <PropertyDetailPageClient id={id} />;
}
