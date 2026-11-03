/**
 * Pure utility functions for Clip Studio export, batch processing, and timeline management.
 */

export function f2(t: number): string {
  t = Math.max(0, t);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
}

export function f1(t: number): string {
  return f2(t) + '.' + Math.floor((t % 1) * 10);
}

export function dl(d: number): string {
  return d < 60 ? (Math.round(d * 10) / 10) + 's' : f2(d);
}

export function tc(n: string): number | null {
  const clean = String(n).split(/[\\/]/).pop() || '';
  const m = /^(\d{1,3})(?:[-_:](\d{1,2})(?!\d))?(?:[-_:](\d{1,2})(?!\d))?(?!\d)/.exec(clean);
  return m ? m.slice(1).filter(x => x !== undefined).map(Number).reduce((s, v) => s * 60 + v, 0) : null;
}

export function bqName(n: string, used: Set<string>): string {
  const b = String(n).replace(/[^\w\- ]+/g, '').trim() || 'video';
  let f = b, k = 2;
  while (used.has(f.toLowerCase())) {
    f = b + '-' + k++;
  }
  used.add(f.toLowerCase());
  return f;
}

export function bqEst(r: { built?: boolean; mbps?: number; dur?: number }, m?: number): number {
  return r.built ? ((m || r.mbps || 8) * 125000 + 20000) * (r.dur || 0) : 0;
}

export interface Subtitle {
  a: number; // start time (s)
  b: number; // end time (s)
  x: string; // text
}

export function normSubs(L: Subtitle[]): Subtitle[] {
  const filtered = L.filter(c => c && c.x).sort((x, y) => x.a - y.a);
  filtered.forEach((c, i) => {
    const n = filtered[i + 1];
    if (n && c.b > n.a) c.b = n.a;
    if (c.b - c.a < 0.05) c.b = c.a + 0.05;
  });
  return filtered;
}

export function parseSrt(t: string): Subtitle[] {
  const out: Subtitle[] = [];
  const blocks = t.replace(/\r/g, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const L = b.split('\n');
    const i = L.findIndex(l => l.includes('-->'));
    if (i < 0) continue;
    const m = L[i].match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) continue;
    const T = (h: number, mi: number, s: number, fr: string) => h * 3600 + mi * 60 + Number(s) + Number('0.' + fr);
    const x = L.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (x) {
      out.push({
        a: T(Number(m[1]), Number(m[2]), Number(m[3]), m[4]),
        b: T(Number(m[5]), Number(m[6]), Number(m[7]), m[8]),
        x,
      });
    }
  }
  return normSubs(out);
}

/**
 * Magnetic snapping: returns the closest target value within threshold distance.
 */
export function snapToMagnetic(v: number, targets: number[], threshold: number): { best: number; hit: number | null } {
  let best = v;
  let minDiff = threshold;
  let hit: number | null = null;
  for (const t of targets) {
    const diff = Math.abs(t - v);
    if (diff < minDiff) {
      minDiff = diff;
      best = t;
      hit = t;
    }
  }
  return { best, hit };
}

/**
 * Detects silent gaps from audio peaks array (25 samples per second).
 */
export function detectSilences(peaks: ArrayLike<number>, threshold = 0.06, minSecs = 0.4, sampleRate = 25): Array<{ s: number; e: number; d: number }> {
  const silences: Array<{ s: number; e: number; d: number }> = [];
  const minSamples = Math.ceil(minSecs * sampleRate);
  let silentStart = -1;

  for (let i = 0; i < peaks.length; i++) {
    if (peaks[i] < threshold) {
      if (silentStart === -1) silentStart = i;
    } else {
      if (silentStart !== -1) {
        const count = i - silentStart;
        if (count >= minSamples) {
          const s = silentStart / sampleRate;
          const e = i / sampleRate;
          silences.push({ s, e, d: e - s });
        }
        silentStart = -1;
      }
    }
  }

  if (silentStart !== -1 && peaks.length - silentStart >= minSamples) {
    const s = silentStart / sampleRate;
    const e = peaks.length / sampleRate;
    silences.push({ s, e, d: e - s });
  }

  return silences;
}

export const COLOR_FILTERS: Record<string, { n: string; filter: string; preview: string }> = {
  none: { n: 'Normal', filter: 'none', preview: '#2a2e3a' },
  cinematic: { n: 'Cinematic', filter: 'contrast(115%) saturate(120%) sepia(20%)', preview: '#d97706' },
  noir: { n: 'Noir (B&W)', filter: 'grayscale(100%) contrast(140%) brightness(95%)', preview: '#52525b' },
  vibrant: { n: 'Vibrant', filter: 'saturate(150%) contrast(110%) brightness(105%)', preview: '#06b6d4' },
  vintage: { n: 'Vintage', filter: 'sepia(45%) contrast(90%) brightness(105%) saturate(90%)', preview: '#b45309' },
  highcontrast: { n: 'High Contrast', filter: 'contrast(135%) saturate(110%) brightness(100%)', preview: '#8b5cf6' },
};

export interface ProjectPreset {
  id: string;
  name: string;
  cap: string;
  font: string;
  kba: number;
  kb: boolean;
  tr: string;
  filter: string;
  mvol: number;
  vol: number;
  fps: number;
  fmt: string;
}

export function validatePreset(p: unknown): ProjectPreset | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Partial<ProjectPreset>;
  if (!o.name || typeof o.name !== 'string') return null;
  return {
    id: o.id || Math.random().toString(36).slice(2),
    name: o.name.trim() || 'Preset',
    cap: o.cap || 'classic',
    font: o.font || 'auto',
    kba: Number(o.kba) || 0.08,
    kb: o.kb !== false,
    tr: o.tr || 'cut',
    filter: o.filter || 'none',
    mvol: o.mvol == null ? 0.25 : Number(o.mvol),
    vol: o.vol == null ? 1 : Number(o.vol),
    fps: Number(o.fps) || 24,
    fmt: o.fmt === '9:16' ? '9:16' : '16:9',
  };
}
