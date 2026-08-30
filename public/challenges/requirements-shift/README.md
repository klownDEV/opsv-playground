# OPSV-006 — Kravskiftet

Bygg en liten uppgiftstavla för en svensk förening. Du får en ofullständig HTML-, CSS- och JavaScript-app direkt i Playground och tre kravbriefar som öppnas successivt.

## Så fungerar det

1. Få grundflödet för att skapa, redigera och ta bort uppgifter att fungera.
2. Anpassa appen när kunden kräver sökning, statusfilter, tomt läge och lokal lagring.
3. Härda lösningen mot trasig JSON och HTML-injektion samt klara mobil- och tillgänglighetskraven.

Kör kontrollen efter varje förändring. En godkänd runda öppnar nästa brief. Alla tretton krav ger 1 300 poäng.

## Säker körning

Deltagarkoden körs i en sandboxad iframe med unik origin. Nätverk, externa paket, formulärnavigation och åtkomst till Playground-servern är blockerade. `challengeStorage` är ett litet lokalt lagringsgränssnitt för utmaningen och ersätter vanlig `localStorage` i sandboxen.
