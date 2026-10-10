import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/legacyCatalogBridge';
import './styles.css';
import './responsive.css';
import './enhancements.css';
import './promo-carousel.css';
import './product-media.css';
import './platform-polish.css';
import './storefront-experience.css';

const root = document.getElementById('root');
if (!root) throw new Error('BUYSELL application root was not found.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
