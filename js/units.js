// Unit conversion and formatting. Data is stored in metric; convert only for display.
export const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

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
