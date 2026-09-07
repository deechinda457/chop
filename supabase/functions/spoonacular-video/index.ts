import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

// Point cost: 1 point per call (Spoonacular's Search Food Videos docs). Callers
// cache this client-side by recipe title -- a recipe's matched video doesn't
// change between opens, so there's no reason to re-spend points per view.
type SpoonacularVideo = {
  title: string;
  youTubeId: string;
  thumbnail: string;
  length?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'Spoonacular is not configured' }, 500);
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const query = (body.query ?? '').trim();
  if (!query) {
    return jsonResponse({ error: 'A search query is required' }, 400);
  }

  const params = new URLSearchParams({ apiKey, query, number: '1' });
  const spoonacularResponse = await fetch(`https://api.spoonacular.com/food/videos/search?${params.toString()}`);

  if (spoonacularResponse.status === 402) {
    return jsonResponse({ error: 'Daily recipe quota reached. Try again tomorrow.' }, 402);
  }
  if (!spoonacularResponse.ok) {
    const details = await spoonacularResponse.text().catch(() => '');
    console.error(`[spoonacular-video] ${spoonacularResponse.status}: ${details}`);
    return jsonResponse({ error: 'Video search is temporarily unavailable' }, 502);
  }

  const payload = (await spoonacularResponse.json()) as { videos?: SpoonacularVideo[] };
  const video = payload.videos?.[0] ?? null;
  if (!video) {
    return jsonResponse({ video: null });
  }

  return jsonResponse({
    video: {
      title: video.title,
      youTubeId: video.youTubeId,
      thumbnail: video.thumbnail,
    },
  });
});
