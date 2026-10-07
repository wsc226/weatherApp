// Unit conversion and formatting. Data is stored in metric; convert only for display.
export const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// Open-Meteo (timezone=auto) returns the PLACE's wall-clock time with no offset, e.g.
// "2026-09-30T06:00". Format it as-is; parsing it with new Date() would apply the viewer's zone.
export function wallTime(iso, opts = { weekday: 'short', hour: 'numeric' }) {
  const [y, mo, d, h, mi] = iso.split(/[-T:]/).map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi || 0)).toLocaleString('en-US', { ...opts, timeZone: 'UTC' });
}

// Numeric conversions for charts (fmt below returns display strings).
export function conv(units) {
  const imp = units === 'imperial';
  return {
    temp: c => (imp ? c * 9 / 5 + 32 : c),
    precip: mm => (imp ? mm / 25.4 : mm),
    tempUnit: imp ? '°F' : '°C',
    precipUnit: imp ? 'in' : 'mm',
  };
}

// Dew point (°C) from air temperature (°C) and relative humidity (%), Magnus formula with the
// Alduchov-Eskridge constants; accurate to about 0.1 °C between -40 and 50 °C.
export function dewPoint(t, rh) {
  const a = 17.625, b = 243.04;
  const g = Math.log(Math.max(rh, 1) / 100) + (a * t) / (b + t);
  return (b * g) / (a - g);
}

export function fmt(units) {
  const imp = units === 'imperial';
  return {
    temp: c => `${Math.round(imp ? c * 9 / 5 + 32 : c)}°${imp ? 'F' : 'C'}`,
    wind: k => `${Math.round(imp ? k * 0.621371 : k)} ${imp ? 'mph' : 'km/h'}`,
    precip: mm => imp ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`,
    pressure: hpa => `${Math.round(hpa)} hPa`,
    percent: v => `${Math.round(v)}%`,
  };
}
