const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
const OPENVERSE_API_URL = 'https://api.openverse.org/v1/images/';

function normalizeQuery(query: string) {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildQueryParts(title: string, description?: string | null, ingredients: string[] = []) {
  const parts = [title, description ?? '', ...ingredients.slice(0, 4)]
    .map((part) => normalizeQuery(part))
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' ');
}

async function searchOpenverseImages(query: string) {
  if (!query) return [];

  const url = new URL(OPENVERSE_API_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', '6');
  url.searchParams.set('mature', 'false');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.warn('Openverse image search failed', response.status, details);
      return [];
    }

    const payload = (await response.json()) as {
      results?: Array<{
        thumbnail?: string;
        url?: string;
      }>;
    };

    return (payload.results ?? [])
      .map((image) => image.thumbnail ?? image.url ?? '')
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);
  } catch (error) {
    console.warn('Openverse image search error', error);
    return [];
  }
}

async function searchUnsplashImages(query: string) {
  if (!UNSPLASH_ACCESS_KEY || !query) return [];

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '6');
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');
  url.searchParams.set('order_by', 'relevant');
  url.searchParams.set('client_id', UNSPLASH_ACCESS_KEY);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept-Version': 'v1',
      },
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.warn('Unsplash image search failed', response.status, details);
      return [];
    }

    const payload = (await response.json()) as {
      results?: Array<{
        urls?: {
          regular?: string;
          small?: string;
        };
      }>;
    };

    return (payload.results ?? [])
      .map((photo) => photo.urls?.regular ?? photo.urls?.small ?? '')
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);
  } catch (error) {
    console.warn('Unsplash image search error', error);
    return [];
  }
}

export const imageService = {
  async searchRecipeImages({
    title,
    description,
    ingredients,
  }: {
    title: string;
    description?: string | null;
    ingredients?: string[];
  }): Promise<string[]> {
    const query = buildQueryParts(title, description, ingredients);
    if (!query) return [];

    const openverseImages = await searchOpenverseImages(query);
    if (openverseImages.length > 0) return openverseImages;

    return searchUnsplashImages(query);
  },
};
