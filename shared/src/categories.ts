export const CATEGORY_IDS = [
  'animals',
  'food',
  'objects',
  'places',
  'actions',
  'popculture',
  'nature',
  'sports',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CATEGORIES: Record<CategoryId, { label: string; emoji: string }> = {
  animals: { label: 'Animals', emoji: '🐾' },
  food: { label: 'Food', emoji: '🍕' },
  objects: { label: 'Objects', emoji: '🧸' },
  places: { label: 'Places', emoji: '🗺️' },
  actions: { label: 'Actions', emoji: '🏃' },
  popculture: { label: 'Movies & Pop Culture', emoji: '🎬' },
  nature: { label: 'Nature', emoji: '🌿' },
  sports: { label: 'Sports', emoji: '⚽' },
};

/** Label used when a round comes from a host-supplied pair. */
export const CUSTOM_CATEGORY_LABEL = 'Custom';
