# OPSV-001 — Promptkomprimering

Målet är att ersätta `reference-prompt.txt` med en kortare systemprompt utan att något testat beteende går förlorat.

## Låst körning

Utmaningen körs i en deterministisk simulator direkt i webbläsaren. Den kontrollerar att prompten uttrycker reglerna som behövs för kategori, prioritet, språk och exakt JSON-format. Inget modell-API, ingen API-nyckel och ingen extern tjänst används.

Utdata ska vara ett enda JSON-objekt med nycklarna `category`, `priority` och `reply_language`. Ingen markdown eller extra text.

## Godkänt resultat

Alla tolv fall ska matcha de tre förväntade fälten exakt. Tokenantalet räknas lokalt med Playground-versionens låsta ord- och symbolräknare. Poängen är `round(100000 / tokens)`.

Arbetsytan autosparar prompten lokalt. När 12/12 fall är godkända kan en Discord-inloggad deltagare skicka in prompt och beräknad poäng direkt.
