# OPSV-007 · MCP-vakten

Bygg en lokal kontrollpanel som bedömer syntetiska verktygsanrop från en AI-agent innan något får utföras. Lösningen består av HTML, CSS och JavaScript direkt i Playground.

## Kontrakt

Skapa `evaluateAction(request, policy)` och returnera alltid ett objekt med:

```json
{ "decision": "allow | review | block", "reason": "begriplig förklaring" }
```

Behåll de id:n och data-attribut som finns i startkoden. Alla tolv anrop, tjänster och värden är påhittade och körs utan nätverk. Playground utför aldrig verktygsanropen; det testar endast din policy och ditt gränssnitt i en sandboxad iframe.

## Tre rundor

1. Bygg kön, detaljpanelen och grundbesluten för offentlig respektive privat läsning.
2. Lägg till beloppsgräns, mottagarlista, skärpt policy, dubletter, utgångna godkännanden och lokal revisionslogg.
3. Blockera promptinjektion, hemligheter, parameter-smuggling och okända verktyg. Rendera alltid opålitlig data som text och gör vyn användbar på mobil och med tangentbord.

Alla 24 kontroller måste vara godkända. Maxpoängen är 2 400.
