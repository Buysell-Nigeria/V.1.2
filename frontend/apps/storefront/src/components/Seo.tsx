import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  noIndex?: boolean;
  image?: string;
}

export function Seo({ title, description, noIndex = false, image = '/brand-icon.svg' }: SeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const resolvedTitle = title.includes('BUYSELL') ? title : `${title} · BUYSELL`;
    const resolvedDescription = description || "Shop trusted products from verified sellers on BUYSELL, Nigeria's buyer-first marketplace.";
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    const imageUrl = new URL(image, window.location.origin).toString();
    document.title = resolvedTitle;

    const upsert = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('name=')) element.name = selector.match(/name="([^"]+)/)?.[1] ?? '';
        if (selector.includes('property=')) element.setAttribute('property', selector.match(/property="([^"]+)/)?.[1] ?? '');
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    upsert('meta[name="description"]', 'content', resolvedDescription);
    upsert('meta[name="robots"]', 'content', noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
    upsert('meta[property="og:title"]', 'content', resolvedTitle);
    upsert('meta[property="og:description"]', 'content', resolvedDescription);
    upsert('meta[property="og:type"]', 'content', 'website');
    upsert('meta[property="og:url"]', 'content', canonicalUrl);
    upsert('meta[property="og:image"]', 'content', imageUrl);
    upsert('meta[name="twitter:card"]', 'content', 'summary_large_image');
    upsert('meta[name="twitter:title"]', 'content', resolvedTitle);
    upsert('meta[name="twitter:description"]', 'content', resolvedDescription);
    upsert('meta[name="twitter:image"]', 'content', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    return () => { document.title = previousTitle; };
  }, [title, description, noIndex, image]);

  return null;
}
