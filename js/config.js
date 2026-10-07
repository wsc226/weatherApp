// Map basemap. Swap this one object to change tile providers; keep the attribution.
// OpenStreetMap's standard tiles need no API key. Their tile usage policy allows light use like
// a classroom site but not heavy traffic: https://operations.osmfoundation.org/policies/tiles/
// For a large rollout, move to a provider with a free tier that is domain-restricted
// (for example Stadia Maps or MapTiler) and update `url` and `attribution` here.
// (Carto's basemaps, used earlier, now require an API key.)
export const TILES = {
  name: 'OpenStreetMap',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
