# Chroma CV

Chroma CV is a self-hosted digital CV studio with a public portfolio, a protected editing workspace, image-aware theme generation, and a print-native PDF export. The whole system runs as four containers: public UI, admin UI, API/PDF worker, and PostgreSQL.

## Quick start

1. Copy `.env.example` to `.env` and replace the database password, JWT secret, and administrator credentials. The JWT secret must contain at least 32 characters.
2. Start everything:

   ```bash
   docker compose up --build
   ```

3. Open the public CV at [http://localhost:8080](http://localhost:8080), the studio at [http://localhost:8081](http://localhost:8081), and the API health endpoint at [http://localhost:3000/health](http://localhost:3000/health).

For a zero-configuration local demo, Compose supplies documented development defaults. Change them before exposing the service outside your machine.

## Architecture

| Component | Technology | Port | Responsibility |
| --- | --- | ---: | --- |
| Public | React, Vite, nginx | 8080 | Published CV, responsive theme, printer interaction |
| Admin | React, Vite, nginx | 8081 | Authenticated draft editor, theme controls, image upload, previews |
| API | Fastify, Zod, Sharp, Playwright | 3000 | Validation, auth, content, images, palettes, publishing, PDF |
| Database | PostgreSQL 16 | internal | Draft/published snapshots, theme tokens, administrators, audit log |

The API is the only component that talks to PostgreSQL or the upload volume. The public application receives only the published snapshot. The studio edits the draft snapshot and publishes explicitly, so unfinished work never leaks to the public CV. The PDF renderer uses a purpose-built semantic print document—not a screenshot—so text remains selectable, links remain clickable, and cards avoid awkward page breaks.

The visual direction is an editorial “paper, ink, and spectral accent” system. Large, close-set type gives the CV personality while numbered sections, disciplined spacing, and quiet borders keep it readable. All colors are CSS tokens supplied by the API, so a new theme applies instantly without a rebuild.

## Content workflow

1. Sign in to the studio with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. Edit profile fields and any section or entry. Sections can be reordered, hidden, shown, added, or deleted.
3. Save the draft. Use the persistent right-side preview or generate an inline PDF preview.
4. Upload a JPEG, PNG, or WebP portrait. The API validates it, applies EXIF rotation, uses attention-aware portrait cropping, converts it to a responsive WebP asset, and derives a palette from its dominant color.
5. Regenerate or fine-tune every palette token, typography choice, corner radius, and spacing value.
6. Publish. The public CV and its next PDF export now use that immutable published snapshot.

## Theme generation and accessibility

Sharp samples a normalized version of the uploaded image and extracts its dominant RGB value. The theme engine creates a deep background, elevated surface, primary and complementary accents, then adjusts text colors until they meet their target WCAG contrast ratios (7:1 for main text, 4.5:1 for secondary text, and 3:1 for graphical accents). Administrators can override the generated tokens or reset to the default palette.

Motion is cosmetic and guarded by `prefers-reduced-motion`. Keyboard focus, skip navigation, semantic headings, alt text, live status announcements, and explicit error states are included.

## PDF export

The API launches an isolated headless Chromium process for each export and renders a dedicated 210 mm-wide continuous print document with:

- selectable text and live `mailto:`, `tel:`, and project links;
- print backgrounds and the published theme tokens;
- one dynamically measured page instead of arbitrary A4 page breaks;
- full-bleed theme color with spacing kept inside the colored canvas;
- no navigation, animation, or interface controls;
- a meaningful filename and PDF document outline/tagging.

The public printer interaction keeps progress visible while the API renders, downloads only after a complete response, always restores the page, and offers a retry after failures. Reduced-motion users see a simple opacity fallback.

## Development and tests

Each application has its own package manifest and can run independently. The normal integration environment is Compose.

```bash
docker compose build
docker compose run --rm api npm test
docker compose run --rm admin npm test
```

Tests cover CV/theme validation, unique and ordered editing helpers, generated palette contrast, and real Chromium PDF generation. Build-time TypeScript checks run for every application image.

To reset all demo content and credentials, stop the stack and intentionally remove its volumes:

```bash
docker compose down --volumes
docker compose up --build
```

This deletes the local database and uploaded portrait.

## Backup and restore

Database backup:

```bash
docker compose exec -T database pg_dump -U cv_user -d digital_cv -Fc > digital-cv.dump
```

Uploads are stored in the named `cv_uploads` volume. Back up that volume separately using your container platform’s volume tooling. Restore the database into an empty instance with `pg_restore`; restore uploads before starting the API so stored filenames and assets remain aligned.

## Deployment notes

- Terminate TLS at a reverse proxy and route the three public ports to separate hostnames or paths.
- Set `PUBLIC_ORIGIN`, `ADMIN_ORIGIN`, and `VITE_API_URL` to their externally reachable HTTPS origins before building.
- Use a secret manager for `DATABASE_URL`, `JWT_SECRET`, and administrator credentials; never commit `.env`.
- Restrict the admin origin at the network layer when possible. Cookies are HTTP-only and become `Secure` when the admin origin uses HTTPS.
- Keep database and upload volumes on encrypted, backed-up storage.
- Add resource limits and centralized logs appropriate to the target platform. Playwright PDF rendering is the main memory consumer.
- Run migrations before a rolling API deployment. Files in `database/migrations` initialize a new PostgreSQL volume; use your deployment platform’s migration job for existing databases.

## Operational checks

All services declare health checks and dependency gates. Useful diagnostics:

```bash
docker compose ps
docker compose logs api
curl http://localhost:3000/health
```

The default database and upload volumes survive `docker compose down`. Only `docker compose down --volumes` removes them.
