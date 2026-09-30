// Reusable time scrubber: play/pause, step, speed. Calls onChange(index).
export class Timeline {
  constructor({ range, play, back, fwd, speed, onChange }) {
    this.range = range;
    this.playBtn = play;
    this.speedSel = speed;
    this.onChange = onChange;
    this.timer = null;
    this.i = 0;
    this.n = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    range.addEventListener('input', () => this.goto(+range.value));
    back.addEventListener('click', () => { this.pause(); this.goto(this.i - 1); });
    fwd.addEventListener('click', () => { this.pause(); this.goto(this.i + 1); });
    play.addEventListener('click', () => (this.timer ? this.pause() : this.play()));
    speed.addEventListener('change', () => { if (this.timer) { this.pause(); this.play(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
  }

  setLength(n, start = 0) {
    this.n = n;
    this.range.max = n - 1;
    this.pause();
    this.goto(start);
  }

  goto(i) {
    this.i = Math.max(0, Math.min(this.n - 1, i));
    this.range.value = this.i;
    this.onChange(this.i);
  }

  play() {
    if (this.reduced) return; // respect reduced motion: students step manually instead
    this.playBtn.textContent = '⏸';
    this.playBtn.setAttribute('aria-label', 'Pause');
    this.timer = setInterval(() => this.goto(this.i + 1 >= this.n ? 0 : this.i + 1), +this.speedSel.value);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.playBtn.textContent = '▶';
    this.playBtn.setAttribute('aria-label', 'Play');
  }
}
