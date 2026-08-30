# OPSV-002 — Trasigt API

Laga `catalog.ts` så att kontraktet nedan och alla tester uppfylls. Ändra inte exporterade namn, parametrar eller returtyper.

## Kontrakt

- `findProduct` jämför id exakt och får aldrig kasta för saknade produkter.
- `searchProducts` är skiftlägesokänslig, trimmar sökningen och ändrar inte indata.
- `reserveStock` accepterar endast positiva heltal och får aldrig skapa negativt lagersaldo.
- `basketTotal` summerar pris gånger antal i ören utan flyttalsavrundning.
- Alla funktioner får behandla indata som immutable.

De sex publika testerna ger 100 poäng vardera. Fyra automatiska kantfall ger 200 poäng vardera. Maxpoängen är 1 400.

Du kan skriva, köra och skicka in lösningen direkt i Playground. Testmiljön körs lokalt i webbläsaren utan nätverk eller åtkomst till servermiljön.
