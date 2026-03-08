# NPO Map SK

An interactive map of non-profit organizations in Slovakia, built with Next.js, Prisma (PostgreSQL), and Leaflet.

## Prerequisites

- Node.js 18+
- Docker Desktop (for local Supabase and the Nominatim geocoder)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local Supabase instance

```bash
npx supabase start
```

This spins up a local PostgreSQL database on port `54322`. On first run it downloads the Docker images — allow a few minutes.

Once running, set your `.env` to point at it (this is already the default):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
NEXTAUTH_SECRET="npomap-dev-secret-change-in-production-2024"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run migrations

```bash
npx prisma migrate dev --name init
```

### 4. Import organization data

Place `npo-data.csv` and `npo-addresses.json` in the `data/` folder, then run:

```bash
npm run db:seed
```

This imports all ~88k NPO records. Coordinates will be approximate (city-level) at this point.

### 5. Fix coordinates

The seed assigns approximate city-level coordinates. To get accurate street-level coordinates you have two options:

#### Option A — Copy from an existing geocoded `dev.db` (fast, recommended)

If you have a `dev.db` SQLite file that was previously re-geocoded, just run:

```bash
npm run db:copy-coords
```

This reads `latitude`/`longitude` from `dev.db` (matching organizations by `ico` and branches by org + street + city) and bulk-updates the PostgreSQL database. All 88k organizations and ~14k branches complete in under a minute.

#### Option B — Re-geocode from scratch using self-hosted Nominatim (~5–10 min)

Use this if you don't have a geocoded `dev.db`.

**a) Start the local Nominatim geocoder:**

```bash
docker compose -f docker-compose.geocoder.yml up -d
```

> **First run only:** Downloads the Slovakia OSM extract (~316 MB) and builds the search index. Takes ~10–20 minutes. Monitor progress with:
> ```bash
> docker logs nominatim-sk --tail 20
> ```
> Wait until you see: `--> Nominatim is ready to accept requests`
>
> **Subsequent runs:** The index is persisted in a Docker volume — starts in seconds.

**b) Run the re-geocoding script:**

```bash
npm run db:regeocode:branches
```

Runs 16 parallel workers with no rate limit. All 88k orgs + branches complete in ~5–10 minutes.

**c) Stop the geocoder when done:**

```bash
docker compose -f docker-compose.geocoder.yml down
```

Optional flags for `db:regeocode`:

| Flag | Description |
|---|---|
| `--dry-run` | Preview results without writing to the DB |
| `--branches` | Also re-geocode Branch records |
| `--workers=N` | Number of parallel workers (default: 16) |
| `--url=http://…` | Override the Nominatim base URL |

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Copying Local Database to Supabase Cloud

If your local Supabase database is fully set up (migrated, seeded, geocoded) and you want to push it to the cloud in one go, use `pg_dump` / `pg_restore` via the PostgreSQL container that is already running inside local Supabase — no need to install any PostgreSQL tools locally.

### 1. Dump the local database

```bash
docker exec supabase_db_npo-map-sk pg_dump -U postgres -d postgres --no-owner --no-acl -F c --schema=public -f /tmp/npo-map-sk.dump
docker cp supabase_db_npo-map-sk:/tmp/npo-map-sk.dump ./npo-map-sk.dump
```

> **`--schema=public` is required.** Without it, `pg_dump` includes Supabase's internal schemas (`storage`, `extensions`, `realtime`) which already exist in the cloud database and are owned by superusers — causing errors like `must be owner of table`, `publication already exists`, and `Non-superuser owned event trigger` during restore.

### 2. Copy the dump file into the container and restore to cloud

Use the **Session pooler URL** (port 5432) from **Supabase Dashboard → Project Settings → Database → Connection string → Session pooler**. It looks like:

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

> **⚠️ Do not use the Direct connection URL** (`db.[ref].supabase.co`) here. That hostname resolves to an IPv6 address which Docker on Windows cannot reach, resulting in a "Network is unreachable" error. The session pooler hostname (`pooler.supabase.com`) resolves to IPv4 and works correctly.

```bash
# Copy the dump back into the container so pg_restore can read it
docker cp ./npo-map-sk.dump supabase_db_npo-map-sk:/tmp/npo-map-sk.dump

# ⚠️ Drop and recreate the public schema on the cloud DB — this wipes all existing data
docker exec supabase_db_npo-map-sk psql -U postgres "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore
docker exec supabase_db_npo-map-sk pg_restore -U postgres --no-owner --no-acl -d "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" /tmp/npo-map-sk.dump
```

> **Note:** The `DROP SCHEMA` step wipes the target database completely before restoring. Only run it if you intend to fully replace the cloud database.

### 3. Add `.dump` to `.gitignore`

The dump file contains all your data and should not be committed to git:

```bash
echo "*.dump" >> .gitignore
```

---

## Deploying with Supabase + Vercel

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project and wait for it to provision.

### 2. Get your connection strings

In the Supabase dashboard go to **Project Settings → Database → Connection string** and copy:

| Variable | Where to find it | Port |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (Mode: Transaction) | 6543 |
| `DIRECT_URL` | **Direct connection** | 5432 |

Append `?pgbouncer=true` to the end of `DATABASE_URL`.

Update your local `.env` with these values (needed for the seeding steps below).

### 3. Push your local database to Supabase cloud

If your local Supabase database is fully set up (migrated, seeded, geocoded) push it to the cloud in one go — see [Copying Local Database to Supabase Cloud](#copying-local-database-to-supabase-cloud).

Otherwise, run migrations and seed manually:

```bash
# Apply migrations
npx prisma migrate deploy

# Seed data
npm run db:seed

# Copy geocoded coordinates from dev.db
npm run db:copy-coords
```

> **Note:** `DIRECT_URL` must be set in your local `.env` for `prisma migrate deploy` to work. It does not need to be set in Vercel.

### 4. Deploy to Vercel

Install the Vercel CLI and log in:

```bash
npm install -g vercel
vercel login
```

Link and deploy the project:

```bash
vercel deploy --prod
```

On first run this will ask you to link to an existing Vercel project or create a new one. Follow the prompts.

### 5. Set environment variables in Vercel

Add each variable using the CLI — you will be prompted to paste the value:

```bash
# Transaction pooler URL with ?pgbouncer=true — used by the app at runtime
vercel env add DATABASE_URL production

# Your Vercel deployment URL
vercel env add NEXTAUTH_URL production

# Generate a secure secret first, then paste it when prompted
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
vercel env add NEXTAUTH_SECRET production
```

Values to use:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Output of the `node -e` command above |

> - `DATABASE_URL` must use the **Transaction pooler** (port 6543) with `?pgbouncer=true`. Do not use the direct connection URL — it resolves to IPv6 which Vercel cannot reach.
> - `DIRECT_URL` does **not** need to be set in Vercel — it is only used locally for running migrations.
> - Mark `DATABASE_URL` and `NEXTAUTH_SECRET` as **sensitive** when prompted.

To update a variable that was set incorrectly:

```bash
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
```

Verify all variables are in place:

```bash
vercel env ls
```

### 6. Redeploy with the new environment variables

```bash
vercel deploy --prod
```

The app is now live at your Vercel URL with the Supabase cloud database.

---

## Database Scripts

| Command | Description |
|---|---|
| `npm run db:seed` | Import data from CSV + JSON into PostgreSQL |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:reset` | Reset DB and re-import all data |
| `npm run db:copy-coords` | Copy geocoded coordinates from `dev.db` → PostgreSQL |
| `npm run db:regeocode` | Re-geocode organization coordinates via local Nominatim |
| `npm run db:regeocode:branches` | Re-geocode organization + branch coordinates via local Nominatim |

---

## Dev Credentials

| | |
|---|---|
| **Email** | admin@npomap.sk |
| **Password** | admin123 |
