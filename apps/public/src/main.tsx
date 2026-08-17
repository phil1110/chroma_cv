import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Check,
  Github,
  Linkedin,
  Mail,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { PublicPayload, Section } from "./types";
import type { PrinterState } from "./PrinterScene";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PrinterScene = lazy(() =>
  import("./PrinterScene").then((module) => ({ default: module.PrinterScene })),
);

function SectionView({ section, index }: { section: Section; index: number }) {
  return (
    <section
      className="cv-section reveal"
      id={section.id}
      aria-labelledby={`${section.id}-title`}
    >
      <div className="section-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="section-content">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        <div className={`entry-grid type-${section.type}`}>
          {section.entries.map((entry) => (
            <article className="entry" key={entry.id}>
              <div className="entry-head">
                <div>
                  <h3>{entry.title}</h3>
                  {entry.subtitle && (
                    <p className="subtitle">{entry.subtitle}</p>
                  )}
                </div>
                {entry.period && <span className="period">{entry.period}</span>}
              </div>
              {entry.location && (
                <p className="location">
                  <MapPin size={13} />
                  {entry.location}
                </p>
              )}
              {entry.body && <p className="entry-body">{entry.body}</p>}
              {entry.tags?.length ? (
                <ul className="tags" aria-label="Related skills">
                  {entry.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              {entry.url && (
                <a
                  className="entry-link"
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View project <ArrowUpRight size={15} />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrinterButton({ filename }: { filename: string }) {
  const [state, setState] = useState<PrinterState>("idle");
  const [progress, setProgress] = useState(0);
  async function download() {
    setState("working");
    setProgress(8);
    const timer = window.setInterval(
      () => setProgress((p) => Math.min(p + Math.max(2, (88 - p) / 7), 88)),
      220,
    );
    try {
      const response = await fetch(`${API}/api/public/pdf`);
      if (!response.ok) throw new Error("PDF generation failed");
      setProgress(100);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setState("success");
      window.setTimeout(() => setState("idle"), 5000);
    } catch {
      setState("error");
    } finally {
      clearInterval(timer);
    }
  }
  return (
    <div className="printer-zone" aria-live="polite">
      <button
        className={`printer-3d-button ${state}`}
        onClick={download}
        disabled={state === "working"}
        aria-label="Download CV as PDF"
        aria-describedby="printer-status"
      >
        <Suspense fallback={<span className="printer-3d-loading" />}>
          <PrinterScene progress={progress} state={state} />
        </Suspense>
        <span className="printer-3d-copy">
          <small>
            {state === "working"
              ? `${Math.round(progress)}% rendered`
              : "Interactive PDF"}
          </small>
          <strong>
            {state === "working"
              ? "Printing…"
              : state === "success"
                ? "Printed!"
                : "Print my CV"}
          </strong>
        </span>
      </button>
      <p id="printer-status">
        {state === "idle" && "Click the printer to take a copy with you"}
        {state === "working" && "Preparing your application-ready PDF…"}
        {state === "success" && (
          <>
            <Check size={15} /> Thanks for downloading my CV!
          </>
        )}
        {state === "error" && (
          <>
            The printer jammed.{" "}
            <button onClick={download}>
              <RefreshCw size={13} /> Retry
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function App() {
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/public/cv`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);
  const style = useMemo(
    () =>
      data
        ? ({
            "--bg": data.theme.background,
            "--surface": data.theme.surface,
            "--text": data.theme.text,
            "--muted": data.theme.muted,
            "--accent": data.theme.accent,
            "--accent-2": data.theme.accent2,
            "--border": data.theme.border,
            "--radius": `${data.theme.radius}px`,
            "--space": `${data.theme.spacing}px`,
            "--font-head": data.theme.fontHeading,
            "--font-body": data.theme.fontBody,
          } as React.CSSProperties)
        : {},
    [data],
  );
  if (error)
    return (
      <main className="state-page">
        <span className="monogram">CV</span>
        <h1>The portfolio is resting.</h1>
        <p>It couldn’t be loaded just now.</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!data)
    return (
      <main className="state-page loading" aria-busy="true">
        <span className="monogram">CV</span>
        <div className="loading-line" />
        <p>Composing the story…</p>
      </main>
    );
  const cv = data.cv;
  const sections = cv.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);
  return (
    <div className="site" style={style}>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label={`${cv.name}, home`}>
          <span>
            {cv.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          {cv.name}
        </a>
        <nav aria-label="Primary">
          <a href="#about">About</a>
          {sections.slice(0, 3).map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
          <a href={`mailto:${cv.email}`}>Contact</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">
              <span />
              {cv.availability}
            </p>
            <h1>
              {cv.role}
              <em> crafting useful things.</em>
            </h1>
            <p className="tagline">{cv.tagline}</p>
            <div className="hero-actions">
              <a className="button primary" href={`mailto:${cv.email}`}>
                <Mail size={17} />
                Start a conversation
              </a>
              <span>
                <MapPin size={15} />
                {cv.location}
              </span>
            </div>
          </div>
          <div className="portrait-wrap">
            <div className="orbit one" />
            <div className="orbit two" />
            {cv.profileImageUrl ? (
              <img
                src={`${API}${cv.profileImageUrl}`}
                alt={`Portrait of ${cv.name}`}
              />
            ) : (
              <div
                className="portrait-placeholder"
                aria-label="Profile initials"
              >
                {cv.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <span className="portrait-note">Hello — this is me</span>
          </div>
        </section>
        <section className="about cv-section" id="about">
          <div className="section-index">00</div>
          <div className="section-content">
            <h2>About me</h2>
            <p className="lede">{cv.about}</p>
            <div className="socials">
              {cv.socials.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                  {s.label.toLowerCase().includes("git") ? (
                    <Github size={17} />
                  ) : s.label.toLowerCase().includes("linked") ? (
                    <Linkedin size={17} />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}{" "}
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </section>
        {sections.map((section, index) => (
          <SectionView key={section.id} section={section} index={index} />
        ))}
        <section className="contact-band">
          <p>Have a challenge worth solving?</p>
          <a href={`mailto:${cv.email}`}>
            {cv.email}
            <ArrowUpRight />
          </a>
        </section>
      </main>
      <footer>
        <span>Designed with intent · {new Date().getFullYear()}</span>
        <span>
          Last published{" "}
          {cv.updatedAt
            ? new Date(cv.updatedAt).toLocaleDateString()
            : "recently"}
        </span>
      </footer>
      <PrinterButton
        filename={`${cv.name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
