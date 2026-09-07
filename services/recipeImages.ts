const FALLBACK_POOL = [
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
];

function hashSeed(seed?: string | null) {
  const value = (seed ?? 'recipe').trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildFallbackImages(seed?: string | null) {
  const start = hashSeed(seed) % FALLBACK_POOL.length;
  return Array.from({ length: 3 }, (_, index) => FALLBACK_POOL[(start + index) % FALLBACK_POOL.length]);
}

export function getRecipeImages(imageUrls?: string[] | null, seed?: string | null) {
  const images =
    imageUrls?.filter((item) => Boolean(item) && !String(item).includes('source.unsplash.com')) ?? [];
  if (images.length >= 3) return images.slice(0, 3);
  if (images.length === 2) return [images[0], images[1], images[0]];
  if (images.length === 1) return [images[0], images[0], images[0]];
  return buildFallbackImages(seed);
}

export function getRecipePrimaryImage(imageUrls?: string[] | null, seed?: string | null) {
  return getRecipeImages(imageUrls, seed)[0];
}
