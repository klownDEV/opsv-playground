# Bidra till OPSV Playground

Tack för att du bygger öppet med OpenSverige. Projektet startades den 24 augusti 2026 och välkomnar små, fokuserade förbättringar.

## Innan du börjar

- Säkerhetsproblem rapporteras privat enligt [SECURITY.md](./SECURITY.md), aldrig i en publik issue.
- Större produktförändringar bör först diskuteras i en issue eller discussion.
- Undvik funktioner som kräver nya betalda tjänster för deltagarna.
- Ändra aldrig sandlådans säkerhetsgränser utan test, hotanalys och tydlig motivering.

## Arbetsflöde

1. Forka repot och skapa en kortlivad branch från `main`.
2. Installera med `npm ci` och kopiera `.env.example` till `.env.local`.
3. Använd endast egna lokala testuppgifter. Lägg aldrig in verkliga användardata eller produktionshemligheter.
4. Lägg till eller uppdatera tester tillsammans med kodändringen.
5. Kör `npm run security:check` och `npm run check`.
6. Öppna en pull request med problem, lösning, risker och verifiering.

## Kodprinciper

- Servern är den auktoritativa gränsen för autentisering, behörighet och verifierade poäng.
- Deltagar- och agentkod får aldrig exekveras på servern.
- Opålitlig text renderas som text, inte som HTML.
- Nya iframe-/workerflöden ska sakna nätverk och ha begränsad körtid.
- Håll domänlogik utanför React-komponenter när den kan testas separat.
- Gränssnitt ska fungera med tangentbord och utan sidledsskroll vid 360 px.
- All användartext i produkten ska vara på svenska.

## Databasändringar

Kör `npm run db:generate` efter en schemaändring och versionshantera den genererade migrationen. Migrationer ska vara bakåtkompatibla när det är rimligt och får aldrig innehålla riktig data, anslutningssträngar eller databasdump.

## Pull request-checklista

- [ ] Ingen hemlighet, personlig data eller lokal konfiguration ingår.
- [ ] Säkerhetsgränserna är oförändrade eller dokumenterat härdade.
- [ ] Nya beteenden har tester.
- [ ] Mobil, desktop och tangentbord är kontrollerade när UI ändrats.
- [ ] `npm run security:check` passerar.
- [ ] `npm run check` passerar.
- [ ] Dokumentation och changelog är uppdaterade när användarbeteende ändras.
