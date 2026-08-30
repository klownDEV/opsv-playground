# OPSV Playground

> Bygg. Testa. Lär.

OPSV Playground är en öppen svensk plattform för praktiska utmaningar inom AI, kod, UI/UX och agentsäkerhet. Projektet startades den **24 augusti 2026** inom OpenSverige och utvecklas öppet under MIT-licensen.

Produktionsmiljö: [playground.opsv.dev](https://playground.opsv.dev)

## Vad som ingår

- Svenska, reproducerbara utmaningar med inbyggda editors och automatisk rättning.
- CodeMirror-baserad kodupplevelse för HTML, CSS och JavaScript.
- Discord OAuth med minsta behörigheten `identify`.
- Publika profiler och topplista baserade på verifierade resultat.
- PostgreSQL via Drizzle ORM.
- Ett lokalt, filavgränsat MCP-flöde för deltagarnas egna kodagenter.
- Isolerad körning av deltagarkod i webbläsarens iframe eller Web Worker – aldrig på Playground-servern.

Projektet är i aktiv alfafas. Se [CHANGELOG.md](./CHANGELOG.md) för daterade förändringar från projektstarten.

## Teknik

- Next.js App Router, React och TypeScript
- CodeMirror 6
- Drizzle ORM och PostgreSQL
- Discord OAuth 2.0
- Model Context Protocol SDK
- Vercel

## Lokal start

Krav: Node.js 22 eller senare samt npm.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Den publika katalogen fungerar med inbyggd exempeldata utan databas eller OAuth. Inloggning, profiler och inskickning kräver PostgreSQL och egna Discord-uppgifter.

## Miljövariabler

| Variabel | Krävs för | Hantering |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | kanonisk origin och OAuth | Publik, exempelvis `http://localhost:3000` |
| `DATABASE_URL` | appens PostgreSQL-anslutning | Hemlig, endast server/Vercel |
| `DATABASE_URL_UNPOOLED` | migrationer vid poolad databas | Hemlig och valfri |
| `DISCORD_CLIENT_ID` | Discord OAuth | Serverkonfiguration |
| `DISCORD_CLIENT_SECRET` | Discord OAuth | Hemlig, aldrig `NEXT_PUBLIC_*` |
| `AUTH_SECRET` | signerade sessioner | Hemlig, minst 32 slumpmässiga tecken |

`.env.local`, `.vercel/` och lokala agentinställningar ignoreras av Git. Endast den tomma mallen `.env.example` ska versionshanteras.

## Discord OAuth

Varje installation använder en egen applikation i Discord Developer Portal.

1. Skapa en Discord-applikation.
2. Lägg till `http://localhost:3000/api/auth/callback/discord` för lokal utveckling.
3. Lägg till produktionsdomänens motsvarande callback.
4. Lägg client ID och client secret i `.env.local` eller Vercels miljövariabler.
5. Skapa ett separat `AUTH_SECRET`. Ingen Discord-bot behövs.

OAuth-flödet använder engångs-state, HTTP-only cookies, signerade sessioner, kanonisk origin, tidsbegränsade Discord-anrop och validerade profilsvar.

## Databas

```bash
npm run db:generate   # efter schemaändring
npm run db:migrate
npm run db:seed       # idempotent challenge-seed
```

Migrationsfilerna är avsedda att versionshanteras. Databasdump, användardata och anslutningsuppgifter får aldrig läggas i repot.

## Säkerhetsmodell

- Deltagarkod exekveras inte i Vercel Functions eller databasmiljön.
- Iframes har en egen strikt CSP och saknar nätverk; Web Workers tidsbegränsas och termineras.
- MCP-servern kan bara läsa och skriva tre fält i en uttryckligen vald lokal JSON-fil. Den erbjuder inget shell, nätverk, Discord, databas eller inskickning.
- Server Actions autentiserar deltagaren och räknar om automatiska resultat på servern.
- Säkerhetsheaders förhindrar inbäddning, MIME-sniffning och onödiga webbläsarbehörigheter.

Kodutmaningarna behöver `unsafe-eval` och `blob:`-workers i sidans CSP för den uttryckliga lokala körmiljön. Den opålitliga lösningskoden hålls därför i separata iframe-/workergränser med blockerade nätverks-API:er. Läs [SECURITY.md](./SECURITY.md) innan du ändrar dessa gränser.

## Kontroller

```bash
npm run security:check
npm run check
```

`security:check` söker efter högriskhemligheter i publicerbara filer och kör npm:s produktionsaudit. `check` kör lint, typkontroll, tester och full produktionsbuild. GitHub Actions kör samma kvalitetsgrind för pull requests.

## Publicering från en fork

1. Skapa ett eget Vercel-projekt från repot.
2. Provisionera en egen PostgreSQL-databas och Discord-applikation.
3. Lägg hemligheterna i Vercels Environment Variables – aldrig i GitHub-koden.
4. Kör migration och seed mot den nya databasen.
5. Kontrollera OAuth callback och `NEXT_PUBLIC_APP_URL` innan produktion öppnas.

## Bidra

Läs [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) och [SECURITY.md](./SECURITY.md). Säkerhetsbrister rapporteras privat enligt säkerhetspolicyn och ska inte beskrivas i en publik issue.

Efter första push ska maintainers följa [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md) för branch protection, privata säkerhetsrapporter, secret scanning och push protection.

## Licens

[MIT](./LICENSE) · © 2026 OPSV-gemenskapen
