export type Entry = { id: string; title: string; subtitle?: string; period?: string; location?: string; body?: string; tags?: string[]; url?: string };
export type Section = { id: string; type: string; title: string; visible: boolean; order: number; entries: Entry[] };
export type CvDocument = { name: string; role: string; tagline: string; location: string; availability: string; email: string; phone?: string; about: string; socials: { label: string; url: string }[]; sections: Section[]; profileImageUrl?: string; updatedAt?: string };
export type Theme = { background: string; surface: string; text: string; muted: string; accent: string; accent2: string; border: string; fontHeading: string; fontBody: string; radius: number; spacing: number };
export type PublicPayload = { cv: CvDocument; theme: Theme };

