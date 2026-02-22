import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CRAWL_ENDPOINT = Deno.env.get('NEXT_PUBLIC_API_URL') || 'http://localhost:3000';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';

Deno.serve(async (req: Request) => {
  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const defaultParams = {
    neighborhoods: [
      'Hollywood', 'Silver Lake', 'Echo Park', 'Los Feliz',
      'Downtown LA', 'Koreatown', 'West Hollywood', 'Santa Monica',
      'Venice', 'Culver City',
    ],
    propertyTypes: ['apartment', 'house', 'condo', 'townhouse'],
    maxPrice: 10000,
    minPrice: 1000,
  };

  try {
    const response = await fetch(`${CRAWL_ENDPOINT}/api/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      body: JSON.stringify(defaultParams),
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      message: 'Crawl scheduler completed',
      ...result,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Crawl scheduler failed',
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
