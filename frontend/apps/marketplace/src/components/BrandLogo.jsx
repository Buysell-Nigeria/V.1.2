import React from 'react';

/**
 * BUYSELL approved wordmark geometry, with transparent background variants.
 * The supplied brand package can replace these SVG files without rewriting
 * navigation, authentication or checkout components.
 *
 * surface="light" uses dark text, and surface="dark" uses white text.
 */
export function BrandLogo({ surface = 'light', alt = 'BUYSELL', className = '', ...props }) {
  const variant = surface === 'dark' ? 'dark' : 'light';
  return (
    <img
      {...props}
      className={`bs-brand-logo ${className}`.trim()}
      src={`/brand/buysell-on-${variant}.svg`}
      alt={alt}
      decoding="async"
    />
  );
}
