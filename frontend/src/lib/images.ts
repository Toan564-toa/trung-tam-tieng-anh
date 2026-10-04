/** Builds a resized Unsplash URL from a photo id. Replace with real center photos later. */
export const unsplash = (id: string, width = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`
