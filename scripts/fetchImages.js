const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
const OPENVERSE_API_URL = 'https://api.openverse.org/v1/images/';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeQuery(query) {
  return String(query)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildUrl(query, count) {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(count));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');
  url.searchParams.set('client_id', UNSPLASH_ACCESS_KEY);
  return url;
}

async function fetchOpenverseImages(query, count) {
  if (!query) return [];

  const url = new URL(OPENVERSE_API_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(count));
  url.searchParams.set('mature', 'false');

  const response = await fetch(url.toString());
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.warn('[Openverse] request failed:', response.status, details);
    await sleep(300);
    return [];
  }

  const payload = await response.json();
  await sleep(300);

  return (payload?.results ?? [])
    .map((image) => image?.thumbnail || image?.url || '')
    .filter(Boolean);
}

async function fetchUnsplashImages(query, count) {
  if (!UNSPLASH_ACCESS_KEY || !query) return [];

  const response = await fetch(buildUrl(query, count).toString(), {
    headers: {
      'Accept-Version': 'v1',
    },
  });

  const payload = response.ok ? await response.json() : null;
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.warn('[Unsplash] request failed:', response.status, details);
    await sleep(300);
    return [];
  }

  await sleep(300);
  return (payload?.results ?? [])
    .map((photo) => photo?.urls?.regular || photo?.urls?.full || photo?.urls?.small || '')
    .filter(Boolean);
}

module.exports = async function fetchImages(recipeTitle, cuisineType, count = 3) {
  const normalizedTitle = normalizeQuery(recipeTitle);
  const normalizedCuisine = normalizeQuery(cuisineType);
  const firstQuery = normalizeQuery(`${normalizedTitle} ${normalizedCuisine} food dish`);
  const fallbackQuery = normalizeQuery(`${normalizedCuisine} food dish`);

  let images = await fetchOpenverseImages(firstQuery, count);
  if (images.length === 0) {
    images = await fetchOpenverseImages(fallbackQuery, count);
  }

  if (images.length === 0) {
    images = await fetchUnsplashImages(firstQuery, count);
  }

  if (images.length === 0) {
    images = await fetchUnsplashImages(fallbackQuery, count);
  }

  if (images.length === 0) {
    return Array.from({ length: count }, () => DEFAULT_IMAGE);
  }

  while (images.length < count) {
    images.push(images[images.length % images.length] || DEFAULT_IMAGE);
  }

  return images.slice(0, count);
};
