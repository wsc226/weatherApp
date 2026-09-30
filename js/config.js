// Map basemap. Swap this one object to change tile providers; keep the attribution.
// Carto's free basemaps are for non-commercial use; check terms before any commercial release.
export const TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 10,
};

// Initial map view (continental US and southern Canada).
export const START_VIEW = { center: [45, -96], zoom: 3 };
