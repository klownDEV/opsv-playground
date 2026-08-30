#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { lstat, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

const MAX_FILE_CHARS = 12_000;
const MAX_SESSION_BYTES = 80_000;
const ALLOWED_FILES = ["html", "css", "js"] as const;

const FileNameSchema = z.enum(ALLOWED_FILES);
const SessionSchema = z.object({
  schema: z.literal("opsv-agent-session"),
  version: z.literal(1),
  challenge: z.discriminatedUnion("slug", [
    z.object({ id:z.literal("OPSV-006"), slug:z.literal("requirements-shift"), title:z.literal("Kravskiftet") }).strict(),
    z.object({ id:z.literal("OPSV-007"), slug:z.literal("mcp-guard"), title:z.literal("MCP-vakten") }).strict(),
  ]),
  brief: z.object({
    objective: z.string().max(2_000),
    rounds: z.array(z.object({
      number: z.number().int().min(1).max(3),
      label: z.string().max(120),
      title: z.string().max(160),
      requirements: z.string().max(1_000),
    }).strict()).length(3),
    rules: z.array(z.string().max(600)).min(1).max(12),
    verification: z.string().max(1_000),
  }).strict(),
  files: z.object({
    html: z.string().max(MAX_FILE_CHARS),
    css: z.string().max(MAX_FILE_CHARS),
    js: z.string().max(MAX_FILE_CHARS),
  }).strict(),
  metadata: z.object({
    source: z.string().url().max(300),
    exportedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    revision: z.number().int().min(0).max(10_000).default(0),
  }).strict(),
}).strict();

type Session = z.infer<typeof SessionSchema>;
type PreflightCheck = { id: string; name: string; passed: boolean; hint: string };

const requestedPath = process.argv[2];
if (!requestedPath) {
  console.error("Användning: node opsv-agent-mcp.mjs /absolut/sökväg/opsv-agent-session.json");
  process.exit(1);
}

const sessionPath = resolve(requestedPath);
let canonicalSessionPath = "";

async function verifySessionFile() {
  const stat = await lstat(sessionPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Sessionsfilen måste vara en vanlig fil, inte en länk eller katalog.");
  if (stat.size > MAX_SESSION_BYTES) throw new Error(`Sessionsfilen får vara högst ${MAX_SESSION_BYTES} byte.`);
  const canonical = await realpath(sessionPath);
  if (canonicalSessionPath && canonical !== canonicalSessionPath) throw new Error("Sessionsfilens mål ändrades medan MCP-servern kördes.");
  canonicalSessionPath ||= canonical;
}

async function loadSession(): Promise<Session> {
  await verifySessionFile();
  const raw = await readFile(sessionPath, "utf8");
  const parsedJson: unknown = JSON.parse(raw);
  return SessionSchema.parse(parsedJson);
}

async function saveSession(session: Session) {
  const validated = SessionSchema.parse(session);
  const payload = `${JSON.stringify(validated, null, 2)}\n`;
  if (Buffer.byteLength(payload) > MAX_SESSION_BYTES) throw new Error("Sessionsfilen blev för stor och sparades inte.");
  await verifySessionFile();
  const temporaryPath = resolve(dirname(sessionPath), `.opsv-agent-${process.pid}-${randomUUID()}.tmp`);
  await writeFile(temporaryPath, payload, { encoding:"utf8", flag:"wx", mode:0o600 });
  try {
    await rename(temporaryPath, sessionPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  canonicalSessionPath = await realpath(sessionPath);
}

function textResult(value: unknown, isError = false) {
  return { content:[{ type:"text" as const, text:typeof value === "string" ? value : JSON.stringify(value, null, 2) }], isError };
}

function staticPreflight(session: Session): PreflightCheck[] {
  if (session.challenge.slug === "mcp-guard") return mcpGuardPreflight(session);
  const { html, css, js } = session.files;
  const htmlLower = html.toLowerCase();
  const jsLower = js.toLowerCase();
  const requiredMarkup = ["task-form", "task-list", 'name="title"', 'name="owner"', 'name="status"', 'name="due"'].every((token) => htmlLower.includes(token));
  const hasInitialTasks = (js.match(/\bid\s*:/g)?.length ?? 0) >= 2 && jsLower.includes("render");
  const hasCreateFlow = /addEventListener\s*\(\s*["']submit["']/.test(js) && /(?:push\s*\(|tasks\s*=\s*\[)/.test(js);
  const hasEditFlow = jsLower.includes("data-action") && jsLower.includes("edit") && /editing|editid|editingid/i.test(js);
  const hasDeleteFlow = jsLower.includes("delete") && /\.filter\s*\(/.test(js);
  const hasSearch = jsLower.includes("task-search") && /addEventListener\s*\(\s*["']input["']/.test(js) && /\.includes\s*\(/.test(js);
  const hasStatus = jsLower.includes("status-filter") && /(?:["']change["']|\.value)/.test(js);
  const hasStorage = /challengeStorage\s*\.\s*setItem\s*\(/.test(js);
  const hasEmpty = htmlLower.includes("empty-state") && jsLower.includes("empty-state");
  const handlesJson = /try\s*\{/.test(js) && /catch\s*(?:\([^)]*\))?\s*\{/.test(js) && /JSON\s*\.\s*parse\s*\(/.test(js);
  const safeRendering = !/\.innerHTML\s*=/.test(js) && /(?:textContent|createTextNode)/.test(js);
  const labelCount = html.match(/<label\b/gi)?.length ?? 0;
  const accessible = labelCount >= 6 && /:(?:focus|focus-visible)\b/i.test(css);
  const mobile = /box-sizing\s*:\s*border-box/i.test(css) && /min-height\s*:\s*(?:4[0-9]|[5-9][0-9])px/i.test(css) && !/width\s*:\s*[4-9][0-9]{2,}px/i.test(css);

  return [
    { id:"structure", name:"Grundstruktur", passed:requiredMarkup, hint:"Behåll formuläret, listan och de fyra angivna fältnamnen." },
    { id:"initial", name:"Startuppgifter", passed:hasInitialTasks, hint:"Rendera minst två startuppgifter med stabila id:n." },
    { id:"create", name:"Skapa uppgift", passed:hasCreateFlow, hint:"Koppla submit-händelsen till en uppdatering av tasks." },
    { id:"edit", name:"Redigera uppgift", passed:hasEditFlow, hint:"Hantera data-action=edit och håll reda på vilket id som redigeras." },
    { id:"delete", name:"Ta bort uppgift", passed:hasDeleteFlow, hint:"Hantera delete och ta bort rätt id ur tasks." },
    { id:"search", name:"Sökning", passed:hasSearch, hint:"Filtrera listan när #task-search får input." },
    { id:"status", name:"Statusfilter", passed:hasStatus, hint:"Koppla #status-filter till renderingen." },
    { id:"storage", name:"Lokal lagring", passed:hasStorage, hint:"Spara ändringar med challengeStorage.setItem." },
    { id:"empty", name:"Tomt läge", passed:hasEmpty, hint:"Visa .empty-state när inget matchar." },
    { id:"json", name:"Felhanterad JSON", passed:handlesJson, hint:"Använd JSON.parse inuti try/catch och skriv ett begripligt statusmeddelande." },
    { id:"safe-text", name:"Säker textrendering", passed:safeRendering, hint:"Använd textContent/createTextNode och undvik innerHTML för uppgiftsdata." },
    { id:"a11y", name:"Etiketter och fokus", passed:accessible, hint:"Behåll labels och lägg till en tydlig :focus-visible-stil." },
    { id:"mobile", name:"Mobil grundnivå", passed:mobile, hint:"Använd border-box, responsiva bredder och minst 40 px höga kontroller." },
  ];
}

function mcpGuardPreflight(session: Session): PreflightCheck[] {
  const { html, css, js } = session.files;
  const htmlLower=html.toLowerCase(),jsLower=js.toLowerCase();
  const hasStructure=["request-list","detail-panel","detail-decision","audit-log","data-action=\"approve\"","data-action=\"block\""].every(token=>htmlLower.includes(token));
  const hasFunction=/function\s+evaluateAction\s*\(|(?:const|let|var)\s+evaluateAction\s*=/.test(js);
  const hasDecisions=["allow","review","block"].every(token=>jsLower.includes(token));
  const hasLimits=/hardPaymentLimit|paymentLimit/.test(js)&&/(?:amount|belopp)/i.test(js);
  const hasRecipients=/trustedRecipients|recipient/i.test(js);
  const hasPolicyShift=/privateReadMode/.test(js);
  const hasReplay=/duplicateOf|duplicate|dublett/i.test(js)&&/authorizationExpires|expired|utgå/i.test(js);
  const hasInjection=/ignore previous|prompt.?inject|systemregler|injection/i.test(js);
  const hasSecret=/api.?key|secret|token|password|lösenord/i.test(js);
  const hasSmuggling=/DELETE|transfer|method|operation/.test(js);
  const failClosed=/allowedTools/.test(js)&&jsLower.includes("block");
  const hasAudit=jsLower.includes("audit-log")&&/challengeStorage\s*\.\s*setItem\s*\(/.test(js);
  const safeRendering=!/\.innerHTML\s*=/.test(js)&&/(?:textContent|createTextNode|replaceChildren)/.test(js);
  const accessible=/:(?:focus|focus-visible)\b/i.test(css)&&/min-height\s*:\s*(?:4[0-9]|[5-9][0-9])px/i.test(css);
  const mobile=/box-sizing\s*:\s*border-box/i.test(css)&&/@media/i.test(css)&&! /width\s*:\s*[4-9][0-9]{2,}px/i.test(css);
  return [
    {id:"structure",name:"Kontrollpanel",passed:hasStructure,hint:"Behåll kö, detaljpanel, beslut, logg och båda beslutsknapparna."},
    {id:"function",name:"Policyfunktion",passed:hasFunction,hint:"Implementera evaluateAction(request, policy)."},
    {id:"decisions",name:"Tre beslut",passed:hasDecisions,hint:"Returnera allow, review eller block med en reason."},
    {id:"limits",name:"Beloppsgräns",passed:hasLimits,hint:"Jämför betalningsbelopp med policyns hårda gräns."},
    {id:"recipients",name:"Mottagarlista",passed:hasRecipients,hint:"Kontrollera trustedRecipients innan betalning."},
    {id:"policy",name:"Ändrad policy",passed:hasPolicyShift,hint:"Läs privateReadMode från aktuell policy."},
    {id:"replay",name:"Dublett och tid",passed:hasReplay,hint:"Stoppa duplicateOf och utgångna godkännanden."},
    {id:"injection",name:"Promptinjektion",passed:hasInjection,hint:"Identifiera instruktioner som försöker kringgå policyn."},
    {id:"secrets",name:"Hemligheter",passed:hasSecret,hint:"Stoppa payload med nycklar, tokens eller lösenord."},
    {id:"smuggling",name:"Parameter-smuggling",passed:hasSmuggling,hint:"Kontrollera farliga metoder och operationer i payload."},
    {id:"unknown",name:"Fail closed",passed:failClosed,hint:"Neka verktyg som inte finns i allowedTools."},
    {id:"audit",name:"Lokal revisionslogg",passed:hasAudit,hint:"Skriv mänskliga beslut till #audit-log och challengeStorage."},
    {id:"safe-text",name:"Säker textrendering",passed:safeRendering,hint:"Använd textContent och undvik innerHTML för verktygsdata."},
    {id:"a11y",name:"Fokus och klickytor",passed:accessible,hint:"Lägg till focus-visible och minst 40 px höga kontroller."},
    {id:"mobile",name:"Responsiv grund",passed:mobile,hint:"Använd border-box, media query och undvik fasta bredder."},
  ];
}

function createServer() {
  const server = new McpServer(
    { name:"opsv-playground-agent", version:"0.1.0" },
    { instructions:"Arbeta endast med OPSV-sessionens html-, css- och js-filer. Läs briefen först, ändra en fil i taget och kör opsv_preflight före avslut. Förhandskontrollen är vägledande; slutpoäng bestäms alltid av Playground efter återimport." },
  );

  server.registerTool("opsv_read_brief", {
    title:"Läs utmaningens brief",
    description:"Läser de tre kravrundorna och säkerhetsreglerna från den lokala OPSV-sessionen.",
    inputSchema:z.object({}).strict(),
    annotations:{ readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false },
  }, async () => textResult((await loadSession()).brief));

  server.registerTool("opsv_read_file", {
    title:"Läs en lösningsfil",
    description:"Läser endast html, css eller js från den avgränsade OPSV-sessionsfilen.",
    inputSchema:z.object({ name:FileNameSchema }).strict(),
    annotations:{ readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false },
  }, async ({ name }) => {
    const session = await loadSession();
    return textResult({ name, content:session.files[name] });
  });

  server.registerTool("opsv_write_file", {
    title:"Uppdatera en lösningsfil",
    description:`Ersätter endast html, css eller js i OPSV-sessionen. Innehållet får vara högst ${MAX_FILE_CHARS} tecken. Kör inte koden.`,
    inputSchema:z.object({ name:FileNameSchema, content:z.string().max(MAX_FILE_CHARS) }).strict(),
    annotations:{ readOnlyHint:false, destructiveHint:true, idempotentHint:true, openWorldHint:false },
  }, async ({ name, content }) => {
    if (content.includes("\0")) return textResult("Filen innehåller ett otillåtet nolltecken och sparades inte.", true);
    const session = await loadSession();
    session.files[name] = content;
    session.metadata.revision += 1;
    session.metadata.updatedAt = new Date().toISOString();
    await saveSession(session);
    return textResult({ saved:true, name, characters:content.length, revision:session.metadata.revision });
  });

  server.registerTool("opsv_preflight", {
    title:"Kör säker förhandskontroll",
    description:"Gör en snabb statisk kontroll utan att exekvera deltagar- eller agentkod. Resultatet är vägledande och ger aldrig tävlingspoäng.",
    inputSchema:z.object({}).strict(),
    annotations:{ readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false },
  }, async () => {
    const session = await loadSession();
    const checks = staticPreflight(session);
    return textResult({ kind:"static-preflight", executedCode:false, passed:checks.filter((check) => check.passed).length, total:checks.length, checks, next:"Importera samma JSON-fil i Playground för de riktiga webbläsartesterna." });
  });

  server.registerTool("opsv_session_status", {
    title:"Visa sessionsstatus",
    description:"Visar revision och filstorlekar utan att läsa eller ändra någon annan fil.",
    inputSchema:z.object({}).strict(),
    annotations:{ readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false },
  }, async () => {
    const session = await loadSession();
    return textResult({ challenge:session.challenge, revision:session.metadata.revision, updatedAt:session.metadata.updatedAt ?? null, characters:Object.fromEntries(ALLOWED_FILES.map((name) => [name, session.files[name].length])), readyToImport:true, sessionFile:sessionPath });
  });

  return server;
}

try {
  await loadSession();
} catch (error) {
  console.error(`OPSV MCP kunde inte öppna sessionen: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const handle = serveStdio(createServer, {
  onerror(error) { console.error(`OPSV MCP-fel: ${error.message}`); },
  maxSubscriptions:4,
});

console.error(`OPSV Playground MCP är redo för ${sessionPath}`);
process.on("SIGINT", () => { void handle.close().finally(() => process.exit(0)); });
