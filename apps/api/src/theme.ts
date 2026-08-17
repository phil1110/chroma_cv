import sharp from "sharp";
import type { Theme } from "./model.js";
import { defaultTheme } from "./model.js";

export type RGB = { r: number; g: number; b: number };
type HSL = { h: number; s: number; l: number };

const clamp = (n: number, min = 0, max = 255) => Math.max(min, Math.min(max, n));
const hex = ({ r, g, b }: RGB) => `#${[r, g, b].map((value) => Math.round(clamp(value)).toString(16).padStart(2, "0")).join("")}`;
export const parseHex = (value: string): RGB => ({ r: Number.parseInt(value.slice(1, 3), 16), g: Number.parseInt(value.slice(3, 5), 16), b: Number.parseInt(value.slice(5, 7), 16) });
const linear = (value: number) => { value /= 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
export const luminance = (color: RGB) => 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
export const contrast = (a: string, b: string) => { const first = luminance(parseHex(a)); const second = luminance(parseHex(b)); return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05); };
const mix = (a: RGB, b: RGB, amount: number): RGB => ({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });

const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, lightness = (max + min) / 2;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { h: (hue + 360) % 360, s: saturation, l: lightness };
};

const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s, segment = h / 60, x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0] : segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma] : segment < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const offset = l - chroma / 2;
  return { r: (red + offset) * 255, g: (green + offset) * 255, b: (blue + offset) * 255 };
};

const readable = (color: RGB, background: string, target = 4.5) => {
  let candidate = color;
  const destination = luminance(parseHex(background)) > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  for (let step = 0; step < 24 && contrast(hex(candidate), background) < target; step += 1) candidate = mix(candidate, destination, 0.08);
  return hex(candidate);
};

function themeFromHue(hue: number, sourceSaturation: number): Theme {
  const saturation = clamp(sourceSaturation, 0.5, 0.82);
  const background = hex(hslToRgb({ h: hue, s: 0.2, l: 0.075 }));
  const surface = hex(hslToRgb({ h: hue, s: 0.18, l: 0.12 }));
  const accent = readable(hslToRgb({ h: hue, s: saturation, l: 0.64 }), background, 3.2);
  const accent2 = readable(hslToRgb({ h: (hue + 172) % 360, s: 0.68, l: 0.63 }), background, 3.2);
  const text = readable(hslToRgb({ h: (hue + 18) % 360, s: 0.16, l: 0.94 }), background, 7);
  const muted = readable(hslToRgb({ h: (hue + 12) % 360, s: 0.12, l: 0.68 }), background, 4.5);
  const border = hex(hslToRgb({ h: hue, s: 0.14, l: 0.25 }));
  return { ...defaultTheme, background, surface, text, muted, accent, accent2, border };
}

export function themeFromColor(color: RGB): Theme { const hsl = rgbToHsl(color); return themeFromHue(hsl.h, hsl.s); }

export function themeFromPixels(data: Uint8Array, channels = 3): Theme {
  const hueBins = Array.from({ length: 24 }, () => ({ weight: 0, saturation: 0 }));
  for (let offset = 0; offset + 2 < data.length; offset += channels) {
    if (channels === 4 && data[offset + 3] < 180) continue;
    const hsl = rgbToHsl({ r: data[offset], g: data[offset + 1], b: data[offset + 2] });
    if (hsl.l > 0.91 || hsl.l < 0.07 || hsl.s < 0.18) continue;
    const vividness = hsl.s ** 1.8;
    const midtone = 1 - Math.min(0.75, Math.abs(hsl.l - 0.48) * 1.35);
    const weight = vividness * midtone;
    const bin = Math.floor(hsl.h / 15) % hueBins.length;
    hueBins[bin].weight += weight;
    hueBins[bin].saturation += hsl.s * weight;
  }
  const strongestIndex = hueBins.reduce((best, bin, index, all) => bin.weight > all[best].weight ? index : best, 0);
  const strongest = hueBins[strongestIndex];
  if (strongest.weight < 0.25) return { ...defaultTheme };
  return themeFromHue(strongestIndex * 15 + 7.5, strongest.saturation / strongest.weight);
}

export async function themeFromImage(path: string): Promise<Theme> {
  const { data, info } = await sharp(path).rotate().resize(96, 120, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return themeFromPixels(data, info.channels);
}
