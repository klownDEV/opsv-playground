export type Difficulty = "Lätt" | "Medel" | "Svår" | "Extrem";
export type ChallengeStatus = "Öppen" | "Utvald" | "Ny" | "Kommer snart";

export type Challenge = {
  publicId: string; slug: string; title: string; description: string; category: string;
  difficulty: Difficulty; status: ChallengeStatus; challengeType: string; submissionType: string;
  participants: number; submissions: number; scoringLabel: string; scoreFormula: string;
  objective: string; rules: string[]; input: string; output: string;
  resources: { label: string; href: string }[];
};

export const challenges: Challenge[] = [
  {
    publicId: "OPSV-001", slug: "prompt-compression", title: "Promptkomprimering",
    description: "Komprimera en systemprompt i en lokal simulator utan att något av tolv fasta beteendekrav går förlorat.",
    category: "AI / Promptning", difficulty: "Lätt", status: "Utvald", challengeType: "prompt",
    submissionType: "text", participants: 89, submissions: 128, scoringLabel: "Simulator + tokenantal",
    scoreFormula: "GODKÄND: 12/12 FALL · POÄNG = AVRUNDAT (100 000 / LOKALA TOKENS)",
    objective: "Skriv den kortaste instruktionen som uttrycker rätt JSON-format, klassificering, prioritet och svarsspråk så att den deterministiska simulatorn klarar samtliga tolv testfall.",
    rules: ["Alla tolv fall måste ge rätt kategori, prioritet och svarsspråk.", "Simulatorn är låst, deterministisk och körs helt lokalt i webbläsaren.", "Externa API:er, modeller och verktyg behövs inte och används inte.", "Skicka in prompten först när 12/12 fall är godkända. Vid lika poäng vinner färre tokens, därefter tidigast verifierade bidrag."],
    input: "En referensprompt, tolv svenska och engelska supportärenden samt ett exakt utdatakontrakt direkt i Playground.",
    output: "En komprimerad prompt som behåller samtliga testade beteenden och klarar 12/12 lokala simuleringar.",
    resources: [{ label: "KÖRINSTRUKTION", href: "/challenges/prompt-compression/README.md" }, { label: "TESTFALL (JSON)", href: "/challenges/prompt-compression/cases.json" }, { label: "REFERENSPROMPT", href: "/challenges/prompt-compression/reference-prompt.txt" }],
  },
  {
    publicId: "OPSV-002", slug: "broken-api", title: "Trasigt API",
    description: "Laga fyra trasiga API-funktioner och få tio automatiska kontraktstester att gå igenom.",
    category: "Kodning", difficulty: "Medel", status: "Öppen", challengeType: "code",
    submissionType: "code", participants: 61, submissions: 74, scoringLabel: "Automatiska tester",
    scoreFormula: "POÄNG = 100 × PUBLIKA TESTER + 200 × KANTFALL (MAX 1 400)",
    objective: "Laga de fyra funktionerna direkt i Playground och klara samtliga publika tester och automatiska kantfall utan att ändra funktionernas namn eller parametrar.",
    rules: ["Behåll funktionsnamnen och deras parametrar.", "All kod körs lokalt i den isolerade testmiljön.", "Nätverk och externa paket är inte tillgängliga.", "Lösningen måste klara sex publika tester och fyra kantfall."],
    input: "En trasig JavaScript-modul, sex publika tester och en tydlig kontraktsspecifikation.",
    output: "En lagad modul som klarar sex kontraktstester och fyra automatiska kantfall direkt i Playground.",
    resources: [{ label: "KONTRAKT", href: "/challenges/broken-api/README.md" }, { label: "TRASIG MODUL", href: "/challenges/broken-api/catalog.ts" }, { label: "PUBLIKA TESTER", href: "/challenges/broken-api/catalog.test.ts" }],
  },
  {
    publicId: "OPSV-003", slug: "ui-rescue", title: "UI-räddningen",
    description: "Rädda en medvetet dålig checkout direkt i webbläsaren och klara tio UX- och tillgänglighetskontroller.",
    category: "UI / UX", difficulty: "Medel", status: "Öppen", challengeType: "design",
    submissionType: "code", participants: 47, submissions: 52, scoringLabel: "UX-kontroller",
    scoreFormula: "POÄNG = 10 × GODKÄNDA UX-KONTROLLER (MAX 100)",
    objective: "Förvandla en fientlig mobil checkout till ett lugnt, tillgängligt flöde direkt i Playground och behåll alla ursprungliga fält och beteenden.",
    rules: ["Behåll alla fält, val och valideringsregler från startvyn.", "Flödet ska fungera utan sidledsskroll vid 360 px.", "Använd semantisk HTML, tydligt tangentbordsfokus och klickytor på minst 40 px.", "Externa resurser, skript och nätverksanrop är blockerade."],
    input: "En medvetet dålig checkout med redigerbar HTML och CSS, säker liveförhandsvisning och tio automatiska kontroller.",
    output: "En responsiv och semantisk checkout som klarar samtliga kontroller och därefter granskas visuellt.",
    resources: [{ label: "UPPGIFTSBRIEF", href: "/challenges/ui-rescue/README.md" }, { label: "STARTVY", href: "/challenges/ui-rescue/starter.html" }, { label: "SCENARIER", href: "/challenges/ui-rescue/scenarios.md" }],
  },
  {
    publicId: "OPSV-004", slug: "token-miser", title: "Tokensnålast",
    description: "Skriv en kompakt JavaScript-extraktor som gör tio stökiga fakturadokument till korrekt strukturerad data.",
    category: "Optimering", difficulty: "Svår", status: "Ny", challengeType: "benchmark",
    submissionType: "code", participants: 24, submissions: 31, scoringLabel: "Korrekthet + källkodstokens",
    scoreFormula: "GODKÄND: 10/10 DOKUMENT · POÄNG = MAX(0, 20 000 − KÄLLKODSTOKENS)",
    objective: "Bygg funktionen extractInvoice(text) direkt i Playground. Den ska göra tio varierade fakturor till exakt JSON och klara samtliga automatiska kontroller.",
    rules: ["Behåll funktionsnamnet extractInvoice och returnera exakt de fem angivna fälten.", "Koden körs lokalt i en tidsbegränsad, isolerad Web Worker utan nätverk eller externa paket.", "Ingen dokumentspecifik hårdkodning; lösningen ska generalisera och granskas före verifiering.", "Alla tio dokument måste matcha facit för att få poäng. Färre källkodstokens ger högre poäng."],
    input: "Tio syntetiska fakturadokument med varierande språk, brus, datumformat och talformat samt ett strikt utdataschema.",
    output: "En fristående JavaScript-funktion som extraherar invoice_id, supplier, currency, total och due_date för 10/10 dokument.",
    resources: [{ label: "KÖRINSTRUKTION", href: "/challenges/token-miser/README.md" }, { label: "DATASET (JSON)", href: "/challenges/token-miser/documents.json" }, { label: "SCHEMA (JSON)", href: "/challenges/token-miser/schema.json" }],
  },
  {
    publicId: "OPSV-005", slug: "agent-survival", title: "Agentöverlevnad",
    description: "Bygg en agent som överlever så många rundor som möjligt i en simulerad värld.",
    category: "Agenter", difficulty: "Svår", status: "Kommer snart", challengeType: "agent",
    submissionType: "agent", participants: 0, submissions: 0, scoringLabel: "Överlevda rundor",
    scoreFormula: "POÄNG = ÖVERLEVDA RUNDOR + RESURSER",
    objective: "En försmak av framtidens Agentarena. Miljön och utvärderaren förbereds fortfarande.",
    rules: ["Reglerna publiceras tillsammans med arenans körmiljö."], input: "Kommer snart.", output: "Kommer snart.", resources: [],
  },
  {
    publicId: "OPSV-006", slug: "requirements-shift", title: "Kravskiftet",
    description: "Bygg en fungerande föreningsapp från en brief och anpassa den när kraven förändras i tre rundor.",
    category: "AI / Vibe coding", difficulty: "Medel", status: "Ny", challengeType: "product",
    submissionType: "code", participants: 0, submissions: 0, scoringLabel: "Funktion + UX + säkerhet",
    scoreFormula: "POÄNG = 100 × GODKÄNDA KRAV (MAX 1 300)",
    objective: "Bygg uppgiftstavlan direkt i Playground, reagera på två nya kravbriefar och klara tretton automatiska kontroller av funktion, lagring, säkerhet, mobil och tillgänglighet.",
    rules: ["HTML, CSS och JavaScript redigeras direkt i arbetsytan och får skapas med valfritt AI- eller kodverktyg.", "Behåll de angivna id:n, fältnamnen och data-attributen så att de automatiska kontrollerna kan använda appen.", "All deltagarkod körs lokalt i en sandboxad iframe utan nätverk, externa paket eller åtkomst till Playground-servern.", "Importerad och användarskriven text måste behandlas som text, aldrig som betrodd HTML."],
    input: "En ofullständig uppgiftstavla, tre successiva svenska kravbriefar, lokal challengeStorage och tretton automatiska produktkontroller.",
    output: "En responsiv, tangentbordsanvändbar och säker miniapp som klarar samtliga tre kravrundor direkt i Playground.",
    resources: [{ label: "UPPGIFTSBRIEF", href: "/challenges/requirements-shift/README.md" }, { label: "TRE KRAVRUNDOR", href: "/challenges/requirements-shift/brief.md" }],
  },
  {
    publicId: "OPSV-007", slug: "mcp-guard", title: "MCP-vakten",
    description: "Bygg en säker kontrollpanel som bedömer en AI-agents verktygsanrop och stoppar riskfyllda handlingar innan de utförs.",
    category: "AI-agenter / Säkerhet", difficulty: "Svår", status: "Ny", challengeType: "security-product",
    submissionType: "code", participants: 0, submissions: 0, scoringLabel: "Policy + säkerhet + UI",
    scoreFormula: "POÄNG = 100 × GODKÄNDA KONTROLLER (MAX 2 400) · ALLA SÄKERHETSTESTER KRÄVS",
    objective: "Bygg MCP-vakten direkt i Playground: en policyfunktion och en tydlig granskningskö som klassificerar syntetiska verktygsanrop som tillåt, granska eller blockera genom tre allt svårare rundor.",
    rules: ["HTML, CSS och JavaScript redigeras direkt i arbetsytan och får skapas med valfritt AI- eller kodverktyg.", "Implementera evaluateAction(request, policy) och returnera decision: allow, review eller block samt en begriplig reason.", "All deltagarkod körs lokalt i en sandboxad iframe utan nätverk, externa paket, riktiga API-nycklar eller åtkomst till Playground-servern.", "All verktygsdata är opålitlig indata. Okända verktyg, hemligheter, promptinjektioner, parameter-smuggling, dubletter och utgångna godkännanden måste hanteras säkert."],
    input: "Tolv helt syntetiska verktygsanrop mot simulerade svenska tjänster, tre policyomgångar och en lokal MCP-session för valfri kodagent.",
    output: "En responsiv och tangentbordsanvändbar kontrollpanel med granskningskö, beslutsdetaljer och revisionslogg som klarar 24 automatiska kontroller.",
    resources: [{ label: "UPPGIFTSBRIEF", href: "/challenges/mcp-guard/README.md" }, { label: "POLICY (JSON)", href: "/challenges/mcp-guard/policy.json" }, { label: "SCENARIER (JSON)", href: "/challenges/mcp-guard/scenarios.json" }],
  },
];

export const builders = [
  { rank: 1, name: "klown", score: 4820, wins: 3, submissions: 31, completed: 14, bio: "Jag komprimerar prompter, har sönder API:er och lagar ibland CSS." },
  { rank: 2, name: "anna", score: 4610, wins: 2, submissions: 28, completed: 12, bio: "Produktutvecklare som utforskar små, användbara AI-system." },
  { rank: 3, name: "voiddev", score: 4201, wins: 2, submissions: 22, completed: 10, bio: "Gränssnittsutveckling, märkliga vyer och verktyg som inte borde fungera—men gör det." },
  { rank: 4, name: "hex", score: 3860, wins: 1, submissions: 19, completed: 9, bio: "Säkerhetsintresserad byggare från Göteborg." },
  { rank: 5, name: "mira", score: 3515, wins: 1, submissions: 17, completed: 8, bio: "Data, modeller och gemenskapsexperiment." },
  { rank: 6, name: "noll", score: 2980, wins: 0, submissions: 15, completed: 7, bio: "Lär mig öppet, ett trasigt bygge i taget." },
];

export const activity = [
  { user: "klown", action: "LÖSTE", target: "PROMPTKOMPRIMERING", time: "08 MIN SEDAN" },
  { user: "anna", action: "FICK 947 I", target: "TRASIGT API", time: "31 MIN SEDAN" },
  { user: "voiddev", action: "GICK MED I", target: "UI-RÄDDNINGEN", time: "01 TIM SEDAN" },
  { user: "mira", action: "SKICKADE IN", target: "TOKENSNÅLAST", time: "03 TIM SEDAN" },
];

export function getChallenge(slug: string) { return challenges.find((challenge) => challenge.slug === slug); }
export function getBuilder(name: string) { return builders.find((builder) => builder.name.toLowerCase() === name.toLowerCase()); }
