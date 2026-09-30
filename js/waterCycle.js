// Concept animation: the water cycle as SVG + CSS, with step-by-step captions.
const STEPS = [
  { id: 'evap', name: 'Evaporation', text: 'The Sun’s energy turns liquid water into water vapor (a gas), which rises. Plants add vapor too; that part is called transpiration.' },
  { id: 'cond', name: 'Condensation', text: 'Rising air cools. Vapor condenses into tiny droplets around dust particles, forming clouds.' },
  { id: 'prec', name: 'Precipitation', text: 'Droplets combine until they are heavy enough to fall as rain, snow, sleet, or hail.' },
  { id: 'coll', name: 'Collection', text: 'Water runs over land or soaks in (infiltration) and collects in oceans, lakes, and groundwater. Then the cycle repeats.' },
];
const OVERVIEW = 'The water cycle is continuous: energy from the Sun moves water between ocean, air, and land.';

export function mountWaterCycle(el) {
  const wave = 'M0 250 q15 -8 30 0' + ' t30 0'.repeat(21);
  el.innerHTML = `
  <svg viewBox="0 0 600 300" role="img" aria-label="Diagram of the water cycle: sun, sea, rising vapor, cloud, rain, and a mountain with runoff.">
    <rect width="600" height="300" fill="#bfe3ff"/>
    <circle cx="70" cy="55" r="28" fill="#ffd966"/>
    <polygon points="330,240 450,110 570,240" fill="#7a8b6f"/>
    <rect y="230" width="600" height="70" fill="#2f74b5"/>
    <g class="wc-flow" data-step="coll"><path class="wc-wave" d="${wave}" fill="none" stroke="#9fd0ff" stroke-width="3"/></g>
    <g class="wc-evap" data-step="evap">
      <path class="wc-arrow" d="M140 220 v-30 M134 198 l6 -8 l6 8" stroke="#fff" stroke-width="3" fill="none"/>
      <path class="wc-arrow" style="animation-delay:1s" d="M200 220 v-30 M194 198 l6 -8 l6 8" stroke="#fff" stroke-width="3" fill="none"/>
    </g>
    <g class="wc-evap" data-step="cond" fill="#fff">
      <circle cx="220" cy="80" r="26"/><circle cx="250" cy="70" r="30"/><circle cx="285" cy="82" r="24"/><rect x="200" y="82" width="105" height="22" rx="10"/>
    </g>
    <g class="wc-rain" data-step="prec" fill="#3a7bd5">
      <ellipse class="wc-drop" cx="230" cy="115" rx="3" ry="6"/>
      <ellipse class="wc-drop" style="animation-delay:.5s" cx="255" cy="115" rx="3" ry="6"/>
      <ellipse class="wc-drop" style="animation-delay:1s" cx="280" cy="115" rx="3" ry="6"/>
    </g>
    <text x="16" y="285" fill="#fff" font-size="14">Ocean</text>
    <text x="440" y="100" fill="#14213d" font-size="14">Land</text>
  </svg>
  <div class="wc-steps" role="group" aria-label="Water cycle stages"></div>
  <p class="wc-caption" aria-live="polite"></p>
  <button type="button" class="ghost" id="wc-toggle">Pause animation</button>`;

  const svg = el.querySelector('svg'), steps = el.querySelector('.wc-steps'), cap = el.querySelector('.wc-caption');

  const show = id => {
    svg.classList.add('wc-on');
    svg.querySelectorAll('[data-step]').forEach(g => g.classList.toggle('wc-hl', !id || g.dataset.step === id));
    steps.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    cap.textContent = id ? STEPS.find(s => s.id === id).text : OVERVIEW;
  };

  for (const s of STEPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.name;
    b.dataset.id = s.id;
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => show(s.id);
    steps.append(b);
  }
  const all = document.createElement('button');
  all.type = 'button';
  all.textContent = 'Show all';
  all.onclick = () => show(null);
  steps.append(all);

  const tog = el.querySelector('#wc-toggle');
  tog.onclick = () => {
    const paused = svg.classList.toggle('wc-paused');
    tog.textContent = paused ? 'Resume animation' : 'Pause animation';
  };
  show(null);
}
