// Map basemap. Swap this one object to change tile providers; keep the attribution.
// Carto's free basemaps are for non-commercial use; check terms before any commercial release.
export const TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 10,
};

// Data endpoints. A whole school often shares one IP address, so Open-Meteo's free per-IP limits
// can be reached by one busy class. To fix that at scale, point these at a caching proxy
// (for example a Cloudflare Worker that forwards to Open-Meteo) or a paid Open-Meteo plan.
export const API = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
};

// How long responses are reused before asking the server again (minutes). Forecast models only
// update every hour or more, so longer reuse costs little accuracy and saves many requests.
export const CACHE_MINUTES = { forecast: 20, grid: 30, geocoding: 7 * 24 * 60 };

// Map layer grid: at most this many points per view, snapped to a fixed lattice so small pans
// reuse the same (cached) points instead of triggering a new request.
export const GRID_MAX_POINTS = 30;

// Initial map view (continental US and southern Canada).
export const START_VIEW = { center: [45, -96], zoom: 3 };
