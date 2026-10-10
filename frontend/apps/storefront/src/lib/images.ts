export function storefrontImageUrl(url: string | undefined, width = 640) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'res.cloudinary.com' && parsed.pathname.includes('/upload/')) {
      const transformation = `f_auto,q_auto:eco,c_limit,w_${Math.max(160, Math.min(1600, Math.round(width)))}`;
      parsed.pathname = parsed.pathname.replace('/upload/', `/upload/${transformation}/`);
      return parsed.toString();
    }
  } catch {
    // Preserve provider URLs that browsers can still resolve even if URL parsing fails.
  }
  return url;
}
