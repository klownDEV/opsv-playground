# OPSV Playground – lokalt agentläge

Det här är testversionen av OPSV Playgrounds lokala MCP-koppling för **OPSV-006 Kravskiftet** och **OPSV-007 MCP-vakten**.

## Krav

- Node.js 20 eller senare.
- En MCP-kompatibel kodagent som kan starta en lokal stdio-server.
- Ingen API-nyckel ska anges i Playground eller sessionsfilen.

## Kom igång

1. Öppna någon av utmaningarna och fäll ut **Agentläge / MCP**.
2. Ladda ner utmaningens agentsession i JSON-format.
3. Ladda ner `opsv-agent-mcp.mjs`.
   Serverns läsbara TypeScript-källkod finns bredvid som `opsv-agent-mcp.source.ts` för granskning.
4. Lägg till servern i agentens MCP-konfiguration med absoluta sökvägar:

```json
{
  "mcpServers": {
    "opsv-playground": {
      "command": "node",
      "args": [
        "/ABSOLUT/SÖKVÄG/opsv-agent-mcp.mjs",
        "/ABSOLUT/SÖKVÄG/opsv-agent-session.json"
      ]
    }
  }
}
```

Starta om eller återanslut agentens MCP-servrar. Be sedan agenten:

> Läs utmaningens brief, bygg lösningen i de tre OPSV-filerna och kör den statiska förhandskontrollen. Ändra inga andra filer.

När agenten är klar laddar du upp samma JSON-fil i Playground. Playground ignorerar importerad poäng och metadata, laddar endast HTML/CSS/JS och kör om alla riktiga webbläsartester.

## Tillgängliga verktyg

- `opsv_read_brief` – läser brief och regler.
- `opsv_read_file` – läser `html`, `css` eller `js`.
- `opsv_write_file` – ersätter en av de tre tillåtna filerna.
- `opsv_preflight` – gör utmaningsanpassade statiska kontroller utan kodexekvering.
- `opsv_session_status` – visar revision och filstorlekar.

## Säkerhetsmodell

- MCP-servern använder endast den sessionsfil vars absoluta sökväg anges vid start.
- Symboliska länkar, fel utmaning, okända fält och för stora filer stoppas.
- Varje lösningsfil är begränsad till 12 000 tecken och hela sessionen till 80 kB.
- Servern erbjuder inget shell, nätverk, generell filåtkomst, Discord, databas eller inskickning.
- Agentgenererad JavaScript exekveras aldrig av MCP-servern.
- Slutlig kod körs i Playgrounds befintliga sandboxade iframe och måste godkännas av de riktiga testerna.
- Deltagaren måste själv vara Discord-inloggad och bekräfta inskickningen.

MCP-processen körs på deltagarens dator. OPSV kan därför inte begränsa andra verktyg som deltagaren samtidigt har gett sin agent. Använd en tom arbetsmapp och aktivera bara OPSV-servern för den här sessionen.
