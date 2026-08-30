# OPSV-004 — Tokensnålast

Skriv `extractInvoice(text)` i Playground och extrahera ett JSON-objekt per dokument. Resultatet ska matcha facit för samtliga tio dokument.

## Säker körning

- JavaScript-koden körs lokalt i en separat Web Worker.
- Nätverk, lagring, underworkers, externa paket och importer är blockerade.
- Varje körning stoppas efter 1,5 sekunder.
- Ingen modell, API-nyckel eller extern tjänst används.
- Ingen dokumentspecifik hårdkodning är tillåten; bidrag granskas före verifiering.

Poängen är `max(0, 20000 - källkodstokens)`. Ett enda felaktigt dokument ger 0 poäng. När 10/10 dokument är godkända kan en Discord-inloggad deltagare skicka in funktionen direkt.
