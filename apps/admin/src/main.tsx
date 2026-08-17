import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Cv, Entry, Section, State, Theme } from "./types";
import { reorderSections } from "./editor";
import "./styles.css";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const r = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!r.ok) {
    const x = await r.json().catch(() => ({ error: "Request failed" }));
    throw Error(x.error || "Request failed");
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@example.com"),
    [password, setPassword] = useState("ChangeMe123!"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-art">
        <span className="brand-mark">CS</span>
        <p>Chroma Studio</p>
        <h1>
          Your work,
          <br />
          <em>beautifully told.</em>
        </h1>
        <div className="swatches">
          <i />
          <i />
          <i />
        </div>
      </div>
      <form onSubmit={submit}>
        <span className="overline">Private workspace</span>
        <h2>Welcome back</h2>
        <p>Sign in to shape and publish your digital CV.</p>
        <label>
          Email
          <input
            autoComplete="username"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <div className="alert">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Enter studio"}
          <ChevronRight size={18} />
        </button>
        <small>Credentials come from your local environment file.</small>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (s: string) => void;
  area?: boolean;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function EntryEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: Entry;
  onChange: (e: Entry) => void;
  onDelete: () => void;
}) {
  const set = (k: keyof Entry, v: string) =>
    onChange({
      ...entry,
      [k]:
        k === "tags"
          ? v
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : v,
    });
  return (
    <details className="entry-editor">
      <summary>
        <div>
          <strong>{entry.title || "Untitled entry"}</strong>
          <span>{entry.subtitle || entry.period || "Edit details"}</span>
        </div>
        <ChevronRight size={17} />
      </summary>
      <div className="entry-fields">
        <Field
          label="Title"
          value={entry.title}
          onChange={(v) => set("title", v)}
        />
        <Field
          label="Subtitle / organization"
          value={entry.subtitle}
          onChange={(v) => set("subtitle", v)}
        />
        <Field
          label="Period"
          value={entry.period}
          onChange={(v) => set("period", v)}
        />
        <Field
          label="Location"
          value={entry.location}
          onChange={(v) => set("location", v)}
        />
        <div className="wide">
          <Field
            label="Description"
            value={entry.body}
            area
            onChange={(v) => set("body", v)}
          />
        </div>
        <Field
          label="Tags (comma separated)"
          value={entry.tags?.join(", ")}
          onChange={(v) => set("tags", v)}
        />
        <Field
          label="Link"
          type="url"
          value={entry.url}
          onChange={(v) => set("url", v)}
        />
        <button className="danger text" onClick={onDelete}>
          <Trash2 size={15} />
          Delete entry
        </button>
      </div>
    </details>
  );
}

function ContentPanel({ cv, setCv }: { cv: Cv; setCv: (c: Cv) => void }) {
  const base = (k: keyof Cv, v: unknown) => setCv({ ...cv, [k]: v });
  function setSection(i: number, s: Section) {
    const sections = [...cv.sections];
    sections[i] = s;
    setCv({ ...cv, sections });
  }
  function move(i: number, d: number) {
    setCv({ ...cv, sections: reorderSections(cv.sections, i, i + d) });
  }
  function addSection() {
    base("sections", [
      ...cv.sections,
      {
        id: uid("section"),
        title: "New section",
        type: "custom",
        visible: true,
        order: cv.sections.length,
        entries: [],
      },
    ]);
  }
  return (
    <div className="panel-stack">
      <section className="editor-card">
        <div className="card-title">
          <div>
            <span>Profile</span>
            <h2>The essentials</h2>
          </div>
          <UserRound />
        </div>
        <div className="form-grid">
          <Field
            label="Name"
            value={cv.name}
            onChange={(v) => base("name", v)}
          />
          <Field
            label="Role"
            value={cv.role}
            onChange={(v) => base("role", v)}
          />
          <div className="wide">
            <Field
              label="Tagline"
              value={cv.tagline}
              area
              onChange={(v) => base("tagline", v)}
            />
          </div>
          <Field
            label="Location"
            value={cv.location}
            onChange={(v) => base("location", v)}
          />
          <Field
            label="Availability"
            value={cv.availability}
            onChange={(v) => base("availability", v)}
          />
          <Field
            label="Email"
            type="email"
            value={cv.email}
            onChange={(v) => base("email", v)}
          />
          <Field
            label="Phone"
            value={cv.phone}
            onChange={(v) => base("phone", v)}
          />
          <div className="wide">
            <Field
              label="About me"
              value={cv.about}
              area
              onChange={(v) => base("about", v)}
            />
          </div>
        </div>
      </section>
      <section className="editor-card">
        <div className="card-title">
          <div>
            <span>Links</span>
            <h2>Social profiles</h2>
          </div>
          <Plus />
        </div>
        <div className="social-editor">
          {cv.socials.map((social, index) => (
            <div className="social-row" key={`${social.label}-${index}`}>
              <Field
                label="Label"
                value={social.label}
                onChange={(value) => {
                  const socials = [...cv.socials];
                  socials[index] = { ...social, label: value };
                  base("socials", socials);
                }}
              />
              <Field
                label="URL"
                type="url"
                value={social.url}
                onChange={(value) => {
                  const socials = [...cv.socials];
                  socials[index] = { ...social, url: value };
                  base("socials", socials);
                }}
              />
              <button
                className="danger icon-button"
                aria-label={`Delete ${social.label} link`}
                onClick={() =>
                  base(
                    "socials",
                    cv.socials.filter((_, item) => item !== index),
                  )
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            className="add-entry"
            onClick={() =>
              base("socials", [
                ...cv.socials,
                { label: "New profile", url: "https://" },
              ])
            }
          >
            <Plus size={15} /> Add social link
          </button>
        </div>
      </section>
      <section className="editor-card">
        <div className="card-title">
          <div>
            <span>Structure</span>
            <h2>CV sections</h2>
          </div>
          <button className="secondary" onClick={addSection}>
            <Plus size={15} />
            Add section
          </button>
        </div>
        <div className="sections-editor">
          {cv.sections.map((section, i) => (
            <div className="section-editor" key={section.id}>
              <div className="section-toolbar">
                <input
                  aria-label="Section title"
                  value={section.title}
                  onChange={(e) =>
                    setSection(i, { ...section, title: e.target.value })
                  }
                />
                <span>{section.entries.length} entries</span>
                <button
                  aria-label="Move up"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  aria-label="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === cv.sections.length - 1}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  aria-label={section.visible ? "Hide section" : "Show section"}
                  onClick={() =>
                    setSection(i, { ...section, visible: !section.visible })
                  }
                >
                  {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  className="danger"
                  aria-label="Delete section"
                  onClick={() =>
                    base(
                      "sections",
                      cv.sections.filter((_, x) => x !== i),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {section.entries.map((entry, j) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  onChange={(next) => {
                    const entries = [...section.entries];
                    entries[j] = next;
                    setSection(i, { ...section, entries });
                  }}
                  onDelete={() =>
                    setSection(i, {
                      ...section,
                      entries: section.entries.filter((_, x) => x !== j),
                    })
                  }
                />
              ))}
              <button
                className="add-entry"
                onClick={() =>
                  setSection(i, {
                    ...section,
                    entries: [
                      ...section.entries,
                      { id: uid("entry"), title: "New entry" },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add entry
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CropUpload({
  onDone,
}: {
  onDone: (theme: Theme, imageUrl: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [busy, setBusy] = useState(false);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setSource(URL.createObjectURL(selected));
    setZoom(1);
    setFocusX(50);
    setFocusY(50);
  }

  function close() {
    if (source) URL.revokeObjectURL(source);
    setSource("");
    if (input.current) input.current.value = "";
  }

  async function applyCrop() {
    const img = image.current;
    if (!img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 1200;
      const baseWidth = Math.min(img.naturalWidth, img.naturalHeight * 0.8);
      const sourceWidth = baseWidth / zoom;
      const sourceHeight = (baseWidth * 1.25) / zoom;
      const sourceX = ((img.naturalWidth - sourceWidth) * focusX) / 100;
      const sourceY = ((img.naturalHeight - sourceHeight) * focusY) / 100;
      canvas
        .getContext("2d")!
        .drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Crop failed")),
          "image/webp",
          0.9,
        ),
      );
      const form = new FormData();
      form.append("image", blob, "profile.webp");
      const result = await api<{ theme: Theme; imageUrl: string }>(
        "/api/admin/profile-image",
        { method: "POST", body: form },
      );
      onDone(result.theme, result.imageUrl);
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={choose}
      />
      <button className="secondary" onClick={() => input.current?.click()}>
        <ImagePlus size={16} /> Upload or replace
      </button>
      {source && (
        <div className="crop-backdrop" role="dialog" aria-modal="true">
          <div className="crop-dialog">
            <div>
              <span className="overline">Portrait crop</span>
              <h3>Frame your profile image</h3>
              <p>Adjust zoom and focal point. The saved crop uses a 4:5 ratio.</p>
            </div>
            <div className="crop-viewport">
              <img
                ref={image}
                src={source}
                alt="Profile crop preview"
                style={{
                  transform: `scale(${zoom})`,
                  objectPosition: `${focusX}% ${focusY}%`,
                }}
              />
            </div>
            <div className="crop-controls">
              <label>
                Zoom
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(+event.target.value)} />
              </label>
              <label>
                Horizontal focus
                <input type="range" min="0" max="100" value={focusX} onChange={(event) => setFocusX(+event.target.value)} />
              </label>
              <label>
                Vertical focus
                <input type="range" min="0" max="100" value={focusY} onChange={(event) => setFocusY(+event.target.value)} />
              </label>
            </div>
            <div className="crop-actions">
              <button className="text" onClick={close}>Cancel</button>
              <button className="primary" onClick={applyCrop} disabled={busy}>
                {busy ? "Processing…" : "Apply crop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ThemePanel({
  theme,
  setTheme,
  cv,
  onGenerated,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cv: Cv;
  onGenerated: (t: Theme, img?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const colors: (keyof Theme)[] = [
    "background",
    "surface",
    "text",
    "muted",
    "accent",
    "accent2",
    "border",
  ];
  async function generate() {
    setBusy(true);
    try {
      onGenerated(
        (
          await api<{ theme: Theme }>("/api/admin/theme/generate", {
            method: "POST",
          })
        ).theme,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-stack">
      <section className="editor-card">
        <div className="card-title">
          <div>
            <span>Profile image</span>
            <h2>Portrait & palette</h2>
          </div>
          <ImagePlus />
        </div>
        <div className="upload-zone">
          {cv.profileImageUrl ? (
            <img src={`${API}${cv.profileImageUrl}`} alt="Current profile" />
          ) : (
            <div className="avatar-empty">
              <UserRound />
            </div>
          )}
          <div>
            <h3>Use your portrait as a color compass</h3>
            <p>
              Uploads are cropped to a portrait, optimized as WebP, and analyzed
              locally. The result is saved to your draft; use Publish when it
              should appear on the public CV.
            </p>
            <CropUpload
              onDone={(generatedTheme, imageUrl) =>
                onGenerated(generatedTheme, imageUrl)
              }
            />
            <button className="text" onClick={generate} disabled={busy}>
              <RefreshCw size={15} />
              Regenerate palette
            </button>
          </div>
        </div>
      </section>
      <section className="editor-card">
        <div className="card-title">
          <div>
            <span>Theme</span>
            <h2>Fine-tune the atmosphere</h2>
          </div>
          <Palette />
        </div>
        <div className="color-grid">
          {colors.map((k) => (
            <label key={k}>
              <span>{String(k).replace("accent2", "accent two")}</span>
              <div>
                <input
                  type="color"
                  value={String(theme[k])}
                  onChange={(e) => setTheme({ ...theme, [k]: e.target.value })}
                />
                <code>{String(theme[k])}</code>
              </div>
            </label>
          ))}
        </div>
        <div className="form-grid theme-options">
          <label className="field">
            <span>Heading font</span>
            <select
              value={theme.fontHeading}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  fontHeading: e.target.value as Theme["fontHeading"],
                })
              }
            >
              <option>Manrope</option>
              <option>Fraunces</option>
              <option>Space Grotesk</option>
              <option>DM Sans</option>
            </select>
          </label>
          <label className="field">
            <span>Body font</span>
            <select
              value={theme.fontBody}
              onChange={(e) =>
                setTheme({
                  ...theme,
                  fontBody: e.target.value as Theme["fontBody"],
                })
              }
            >
              <option>DM Sans</option>
              <option>Inter</option>
              <option>Manrope</option>
            </select>
          </label>
          <label className="range">
            <span>
              Corner radius <b>{theme.radius}px</b>
            </span>
            <input
              type="range"
              min="0"
              max="32"
              value={theme.radius}
              onChange={(e) => setTheme({ ...theme, radius: +e.target.value })}
            />
          </label>
          <label className="range">
            <span>
              Spacing <b>{theme.spacing}px</b>
            </span>
            <input
              type="range"
              min="12"
              max="36"
              value={theme.spacing}
              onChange={(e) => setTheme({ ...theme, spacing: +e.target.value })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function Preview({ cv, theme }: { cv: Cv; theme: Theme }) {
  return (
    <div
      className="preview-frame"
      style={
        {
          "--pbg": theme.background,
          "--psurface": theme.surface,
          "--ptext": theme.text,
          "--pmuted": theme.muted,
          "--paccent": theme.accent,
          "--pradius": `${theme.radius}px`,
        } as React.CSSProperties
      }
    >
      <div className="preview-nav">
        <b>{cv.name}</b>
        <span>About · Work · Contact</span>
      </div>
      <div className="preview-hero">
        <div>
          <small>{cv.availability}</small>
          <h1>
            {cv.role}
            <em> crafting useful things.</em>
          </h1>
          <p>{cv.tagline}</p>
        </div>
        {cv.profileImageUrl ? (
          <img src={`${API}${cv.profileImageUrl}`} alt="" />
        ) : (
          <div className="preview-avatar">
            {cv.name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </div>
        )}
      </div>
      <div className="preview-about">
        <span>00</span>
        <div>
          <h2>About me</h2>
          <p>{cv.about}</p>
        </div>
      </div>
      {cv.sections
        .filter((s) => s.visible)
        .slice(0, 2)
        .map((s, i) => (
          <div className="preview-section" key={s.id}>
            <span>0{i + 1}</span>
            <div>
              <h2>{s.title}</h2>
              {s.entries.slice(0, 2).map((e) => (
                <article key={e.id}>
                  <b>{e.title}</b>
                  <small>{e.period}</small>
                  <p>{e.subtitle}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function Studio({
  initial,
  onLogout,
}: {
  initial: State;
  onLogout: () => void;
}) {
  const [cv, setCv] = useState(initial.cv),
    [theme, setTheme] = useState(initial.theme),
    [tab, setTab] = useState<"content" | "theme">("content"),
    [status, setStatus] = useState("Draft loaded"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDirty(true);
  }, [cv, theme]);
  async function save() {
    setBusy(true);
    try {
      await Promise.all([
        api("/api/admin/cv", { method: "PUT", body: JSON.stringify(cv) }),
        api("/api/admin/theme", { method: "PUT", body: JSON.stringify(theme) }),
      ]);
      setDirty(false);
      setStatus("All changes saved");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    setBusy(true);
    try {
      await save();
      await api("/api/admin/publish", { method: "POST" });
      setStatus("Published — your public CV is live");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pdf() {
    try {
      const r = await fetch(`${API}/api/admin/pdf-preview`, {
        credentials: "include",
      });
      if (!r.ok) throw Error("Could not generate preview");
      const u = URL.createObjectURL(await r.blob());
      window.open(u, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(u), 60000);
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  return (
    <div className="studio">
      <aside>
        <div className="studio-brand">
          <span>CS</span>
          <div>
            <b>Chroma</b>
            <small>CV Studio</small>
          </div>
        </div>
        <nav>
          <button
            className={tab === "content" ? "active" : ""}
            onClick={() => setTab("content")}
          >
            <LayoutDashboard />
            Content
          </button>
          <button
            className={tab === "theme" ? "active" : ""}
            onClick={() => setTab("theme")}
          >
            <Palette />
            Theme & image
          </button>
          <a href="http://localhost:8080" target="_blank" rel="noreferrer">
            <Eye />
            Public CV
          </a>
        </nav>
        <div className="aside-bottom">
          <button onClick={pdf}>
            <FileDown />
            PDF preview
          </button>
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              onLogout();
            }}
          >
            <LogOut />
            Sign out
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="breadcrumb">
              Workspace / <b>{tab === "content" ? "Content" : "Theme"}</b>
            </span>
            <h1>
              {tab === "content" ? "Shape your story" : "Set the visual tone"}
            </h1>
          </div>
          <div className="save-actions">
            <span className={dirty ? "dirty" : ""}>
              {busy ? "Working…" : status}
            </span>
            <button className="secondary" onClick={save} disabled={busy}>
              <Save size={16} />
              Save draft
            </button>
            <button className="primary" onClick={publish} disabled={busy}>
              <Send size={16} />
              Publish
            </button>
          </div>
        </header>
        <div className="workspace">
          <div className="edit-column">
            {tab === "content" ? (
              <ContentPanel cv={cv} setCv={setCv} />
            ) : (
              <ThemePanel
                theme={theme}
                setTheme={setTheme}
                cv={cv}
                onGenerated={(t, img) => {
                  setTheme(t);
                  if (img) {
                    setCv({ ...cv, profileImageUrl: img });
                    setStatus("Portrait saved to draft — publish to make it public");
                  } else {
                    setStatus("A new draft palette is ready");
                  }
                }}
              />
            )}
          </div>
          <aside className="live-preview">
            <div className="preview-heading">
              <div>
                <i />
                <span>Live draft preview</span>
              </div>
              <button onClick={pdf}>
                <FileDown size={15} />
                PDF
              </button>
            </div>
            <Preview cv={cv} theme={theme} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [state, setState] = useState<State | null>(null),
    [checking, setChecking] = useState(true);
  async function load() {
    setChecking(true);
    try {
      await api("/api/auth/me");
      setState(await api("/api/admin/state"));
    } catch {
      setState(null);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (checking)
    return (
      <div className="boot">
        <Settings2 />
        <span>Opening studio…</span>
      </div>
    );
  return state ? (
    <Studio initial={state} onLogout={() => setState(null)} />
  ) : (
    <Login onLogin={load} />
  );
}
createRoot(document.getElementById("root")!).render(<App />);
