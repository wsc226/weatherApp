// Canvas weather scene: sky, drifting clouds, rain/snow particles, fog, lightning.
// Driven by set({type, intensity, cloud, windKmh, windFrom, isDay}).
export class WeatherScene {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.running = !this.reduced;
    this.parts = [];
    this.clouds = [];
    this.flash = 0;
    this.last = 0;
    this.s = { type: 'clear', intensity: 0, cloud: 0, windKmh: 0, windFrom: 270, isDay: 1 };
    this.resize();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { this.last = 0; });
    requestAnimationFrame(t => this.tick(t));
  }

  resize() {
    const r = this.c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.c.width = Math.max(1, r.width * dpr);
    this.c.height = Math.max(1, r.height * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  set(state) {
    Object.assign(this.s, state);
    const wantClouds = Math.round(this.s.cloud / 100 * 9);
    while (this.clouds.length < wantClouds) {
      this.clouds.push({ x: Math.random() * this.w, y: 15 + Math.random() * this.h * 0.35, r: 30 + Math.random() * 30, v: 0.6 + Math.random() * 0.8 });
    }
    this.clouds.length = wantClouds;
    const falls = ['rain', 'snow', 'thunder'].includes(this.s.type);
    const n = falls ? Math.round((this.s.type === 'snow' ? 60 : 80) + 320 * this.s.intensity) : 0;
    while (this.parts.length < n) this.parts.push(this.spawn(true));
    this.parts.length = n;
    if (!this.running) { this.step(1 / 30, 60); this.draw(); } // static frame for paused / reduced motion
  }

  // Pause or resume continuous motion (WCAG 2.2.2). Returns true when now running.
  toggle() {
    this.running = !this.running;
    this.last = 0;
    if (!this.running) this.draw();
    return this.running;
  }

  // Horizontal drift in px/s. Meteorological wind direction is where the wind comes FROM,
  // so wind from the west (270 degrees) pushes things toward +x (east).
  get drift() { return -Math.sin(this.s.windFrom * Math.PI / 180) * Math.min(this.s.windKmh, 60) * 2.2; }

  spawn(anywhere) {
    const snow = this.s.type === 'snow';
    return {
      x: Math.random() * (this.w + 200) - 100,
      y: anywhere ? Math.random() * this.h : -10,
      v: snow ? 30 + Math.random() * 40 : 380 + Math.random() * 220,
      w: Math.random() * 6.28,
    };
  }

  tick(t) {
    requestAnimationFrame(x => this.tick(x));
    if (!this.running || document.hidden) return;
    const dt = this.last ? Math.min((t - this.last) / 1000, 0.05) : 0.016;
    this.last = t;
    this.step(dt, 1);
    this.draw();
  }

  step(dt, times) {
    const snow = this.s.type === 'snow';
    for (let k = 0; k < times; k++) {
      for (const p of this.parts) {
        p.y += p.v * dt;
        p.x += this.drift * dt * (snow ? 0.6 : 1);
        if (snow) { p.w += dt * 2; p.x += Math.sin(p.w) * 12 * dt; }
        if (p.y > this.h) Object.assign(p, this.spawn(false));
        if (p.x > this.w + 100) p.x = -100;
        else if (p.x < -100) p.x = this.w + 100;
      }
      const sign = this.drift < 0 ? -1 : 1;
      for (const c of this.clouds) {
        c.x += (sign * 8 + this.drift * 0.15) * c.v * dt;
        if (c.x - c.r * 2 > this.w) c.x = -c.r * 2;
        else if (c.x + c.r * 2 < 0) c.x = this.w + c.r * 2;
      }
    }
    if (this.s.type === 'thunder' && Math.random() < dt * 0.25) this.flash = 1;
    this.flash = Math.max(0, this.flash - dt * 4);
  }

  draw() {
    const { g, w, h, s } = this;
    const day = s.isDay, dark = ['rain', 'thunder', 'snow'].includes(s.type) || s.cloud > 80;
    const top = day ? (dark ? '#6b7c93' : '#4a90d9') : (dark ? '#1c2433' : '#0b1a3a');
    const bot = day ? (dark ? '#9aa8ba' : '#a9d3f5') : (dark ? '#2b3548' : '#1e3563');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bot);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    if (s.cloud < 60 && s.type !== 'fog') { // sun or moon
      g.fillStyle = day ? '#ffd966' : '#e8ecf5';
      g.beginPath(); g.arc(w * 0.8, h * 0.22, 26, 0, 6.29); g.fill();
    }

    g.fillStyle = day ? `rgba(255,255,255,${dark ? 0.55 : 0.85})` : 'rgba(150,165,190,0.6)';
    for (const c of this.clouds) {
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(c.x + (i - 1.5) * c.r * 0.7, c.y + (i % 2) * c.r * 0.15, c.r * (0.8 - (i % 2) * 0.2), 0, 6.29);
        g.fill();
      }
    }

    if (s.type === 'rain' || s.type === 'thunder') {
      g.strokeStyle = 'rgba(190,215,255,0.75)';
      g.lineWidth = 1.2;
      g.beginPath();
      const slant = this.drift / 380;
      for (const p of this.parts) { g.moveTo(p.x, p.y); g.lineTo(p.x + slant * 12, p.y + 12); }
      g.stroke();
    } else if (s.type === 'snow') {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      for (const p of this.parts) { g.moveTo(p.x + 2, p.y); g.arc(p.x, p.y, 2, 0, 6.29); }
      g.fill();
    }

    if (s.type === 'fog') { g.fillStyle = 'rgba(220,225,232,0.65)'; g.fillRect(0, 0, w, h); }
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`; g.fillRect(0, 0, w, h); }

    // Wind arrow points the way the air is moving (opposite of the "from" bearing).
    if (s.windKmh > 1) {
      const a = (s.windFrom + 180) * Math.PI / 180, cx = 40, cy = h - 50, L = Math.min(30, 8 + s.windKmh);
      const ex = cx + Math.sin(a) * L, ey = cy - Math.cos(a) * L;
      g.strokeStyle = g.fillStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - Math.sin(a) * L, cy + Math.cos(a) * L); g.lineTo(ex, ey); g.stroke();
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.sin(a - 0.5) * 9, ey + Math.cos(a - 0.5) * 9);
      g.lineTo(ex - Math.sin(a + 0.5) * 9, ey + Math.cos(a + 0.5) * 9);
      g.fill();
    }
  }
}
