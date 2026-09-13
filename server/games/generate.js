import { randomBytes, createHash } from 'node:crypto';
export const seed = () => randomBytes(16).toString('hex');
export function random(source) {
  let n = createHash('sha256').update(String(source)).digest().readUInt32LE(0);
  const next = () => {
    n |= 0;
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min, max) => min + Math.floor(next() * (max - min)),
    shuffle: (a) => {
      a = [...a];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
export const fingerprint = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
