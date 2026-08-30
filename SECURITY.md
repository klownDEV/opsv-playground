# Säkerhetspolicy

## Rapporteringskanal

Rapportera misstänkta säkerhetsbrister privat genom GitHub-funktionen **Security → Report a vulnerability** i projektets repository. Skapa inte en publik issue och inkludera inte hemligheter eller verklig persondata i reproduktionsmaterialet.

Beskriv berörd route eller version, minsta säkra reproduktion med syntetisk data, möjlig påverkan och gärna en föreslagen åtgärd. Maintainers bekräftar mottagandet så snart det är praktiskt möjligt och samordnar rättning och publicering med rapportören. Exploatering, åtkomst till andra användares data och publicering före samordnad rättning är inte tillåtet.

## Versioner

Projektet befinner sig i alfafas. Endast den senaste versionen på `main` och aktuell produktionsdeployment får säkerhetsrättningar.

## Hotmodell

Särskilt skyddsvärda delar är OAuth-, sessions- och databashemligheter, användaridentiteter, verifierade resultat samt gränsen mellan Playground och opålitlig deltagar-/agentkod.

Deltagarkod får bara köras i avgränsad iframe eller Web Worker utan serveråtkomst. MCP-servern får endast arbeta med den lokala sessionsfil som deltagaren själv anger. Ändringar som ger deltagarkod nätverk, generell filåtkomst, shell, databas eller serverexekvering betraktas som säkerhetskritiska.

## Hemligheter

- Riktiga värden hör hemma i `.env.local` eller hostingplattformens krypterade miljövariabler.
- `.env.example` innehåller endast tomma eller uppenbara platshållare.
- Om en hemlighet exponeras ska den omedelbart roteras; borttagning ur senaste commit räcker inte.
- Databasdump, produktionsloggar, OAuth-koder, sessionscookies och persondata får inte bifogas issues eller pull requests.

## Beroenden

Dependabot och CI granskar npm-beroenden. Pull requests som ändrar autentisering, sandbox, MCP, migrationskod eller säkerhetsheaders kräver särskilt noggrann granskning.
