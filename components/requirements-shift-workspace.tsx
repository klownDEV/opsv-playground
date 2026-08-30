"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { submitChallenge } from "@/lib/actions";
import { CodeEditor, type CodeLanguage } from "@/components/code-editor";

type FileTab = "html" | "css" | "js";
type Device = "mobile" | "desktop";
type TestDefinition = { id: string; round: 1 | 2 | 3; name: string; hint: string };
type RuntimeResult = { id: string; passed: boolean; detail?: string };
type AuditResult = TestDefinition & { passed: boolean; detail?: string };
type AgentFiles = { html: string; css: string; js: string };

const TESTS: TestDefinition[] = [
  { id: "structure", round: 1, name: "Appens grundstruktur finns", hint: "Behåll #task-form, #task-list och fälten title, owner, status och due." },
  { id: "initial", round: 1, name: "Startuppgifter renderas", hint: "Visa minst två .task-card med unikt data-task-id och data-status." },
  { id: "add", round: 1, name: "En uppgift kan skapas", hint: "Formuläret ska lägga till en ny uppgift och uppdatera listan direkt." },
  { id: "edit", round: 1, name: "En uppgift kan redigeras", hint: "[data-action=edit] ska fylla formuläret och nästa submit ska uppdatera uppgiften." },
  { id: "delete", round: 1, name: "En uppgift kan tas bort", hint: "[data-action=delete] ska ta bort rätt uppgift från listan." },
  { id: "search", round: 2, name: "Sökningen filtrerar direkt", hint: "#task-search ska filtrera på titel eller ansvarig utan hänsyn till stora och små bokstäver." },
  { id: "status", round: 2, name: "Statusfiltret fungerar", hint: "#status-filter ska visa alla, todo, doing eller done med data-status på korten." },
  { id: "storage", round: 2, name: "Ändringar sparas lokalt", hint: "Använd challengeStorage.setItem när uppgiftslistan förändras." },
  { id: "empty", round: 2, name: "Tomt sökresultat förklaras", hint: "Visa ett synligt element med klassen .empty-state när inga uppgifter matchar." },
  { id: "invalid-json", round: 3, name: "Trasig JSON hanteras lugnt", hint: "#import-button ska fånga parse-fel och skriva ett begripligt meddelande i #status-message." },
  { id: "xss", round: 3, name: "Importerad text blir aldrig HTML", hint: "Rendera användardata med textContent eller motsvarande säker DOM-metod, inte innerHTML." },
  { id: "a11y", round: 3, name: "Formuläret är tillgängligt", hint: "Alla kontroller behöver etiketter och CSS behöver en tydlig :focus-visible-stil." },
  { id: "mobile", round: 3, name: "Mobilbredd och klickytor håller", hint: "Ingen sidledsskroll vid 360 px och alla kontroller ska vara minst 40 px höga." },
];

const ROUNDS = [
  { number: 1, label: "FÖRSTA BRIEFEN", title: "Få tavlan att fungera", copy: "Skapa, redigera och ta bort uppgifter. Varje kort ska visa ansvarig, status och deadline." },
  { number: 2, label: "KUNDEN ÄNDRAR SIG", title: "Hitta och kom tillbaka", copy: "Lägg till fritextsökning, statusfilter, tomt läge och lokal lagring via challengeStorage." },
  { number: 3, label: "VERKLIGHETEN HÄNDER", title: "Gör den tålig", copy: "Hantera trasig import, rendera text säkert och få hela flödet att fungera på mobil och med tangentbord." },
] as const;

const STARTER_HTML = `<main class="app-shell">
  <header class="app-header">
    <p class="kicker">FÖRENINGSKONTORET</p>
    <h1>Uppgiftstavlan</h1>
    <p>Samla det som behöver göras inför nästa aktivitet.</p>
  </header>

  <section class="panel" aria-labelledby="form-heading">
    <h2 id="form-heading">Ny uppgift</h2>
    <form id="task-form">
      <label for="title">Uppgift</label>
      <input id="title" name="title" required>
      <label for="owner">Ansvarig</label>
      <input id="owner" name="owner" required>
      <label for="status">Status</label>
      <select id="status" name="status">
        <option value="todo">Att göra</option>
        <option value="doing">Pågår</option>
        <option value="done">Klar</option>
      </select>
      <label for="due">Deadline</label>
      <input id="due" name="due" type="date" required>
      <button type="submit">Lägg till</button>
    </form>
  </section>

  <section class="toolbar" aria-label="Filtrera uppgifter">
    <label for="task-search">Sök</label>
    <input id="task-search" type="search" placeholder="Titel eller ansvarig">
    <label for="status-filter">Visa status</label>
    <select id="status-filter">
      <option value="all">Alla</option>
      <option value="todo">Att göra</option>
      <option value="doing">Pågår</option>
      <option value="done">Klara</option>
    </select>
  </section>

  <section class="panel" aria-labelledby="list-heading">
    <h2 id="list-heading">Uppgifter</h2>
    <p id="status-message" aria-live="polite"></p>
    <ul id="task-list"></ul>
    <p class="empty-state" hidden>Inga uppgifter matchar.</p>
  </section>

  <section class="panel import-panel" aria-labelledby="import-heading">
    <h2 id="import-heading">Importera JSON</h2>
    <label for="import-data">Uppgiftsdata</label>
    <textarea id="import-data" rows="4"></textarea>
    <button id="import-button" type="button">Importera</button>
  </section>
</main>`;

const STARTER_CSS = `* { box-sizing: border-box; }
body { margin: 0; background: #f2f1e9; color: #171714; font-family: Arial, sans-serif; }
.app-shell { width: min(760px, calc(100% - 32px)); margin: 32px auto; }
.app-header { margin-bottom: 24px; }
.kicker { font: 700 11px monospace; letter-spacing: .08em; }
h1 { margin: 8px 0; font-size: clamp(26px, 8vw, 72px); line-height: .9; overflow-wrap: anywhere; text-transform: uppercase; }
.panel, .toolbar { margin-top: 12px; padding: 18px; border: 1px solid #171714; background: white; }
form, .toolbar { display: grid; gap: 8px; }
label { font: 700 11px monospace; text-transform: uppercase; }
input, select, textarea, button { width: 100%; min-height: 38px; border: 1px solid #777; border-radius: 0; padding: 8px; font: inherit; }
button { background: #171714; color: #d8ff36; font-weight: 700; cursor: pointer; }
#task-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
.task-card { padding: 12px; border: 1px solid #aaa; }
.task-card h3 { margin: 0 0 6px; }
.task-actions { display: flex; gap: 8px; margin-top: 10px; }
.task-actions button { width: auto; }
@media (min-width: 640px) {
  #task-form { grid-template-columns: 1fr 1fr; }
  #task-form button { grid-column: 1 / -1; }
  .toolbar { grid-template-columns: auto 1fr auto 1fr; align-items: center; }
}`;

const STARTER_JS = `const tasks = [
  { id: "t1", title: "Boka lokalen", owner: "Mira", status: "doing", due: "2026-09-12" },
  { id: "t2", title: "Skicka inbjudan", owner: "Sam", status: "done", due: "2026-09-05" }
];

function renderTasks() {
  const list = document.querySelector("#task-list");
  list.innerHTML = tasks.map(task => \`<li class="task-card" data-task-id="\${task.id}" data-status="\${task.status}">
    <h3 class="task-title">\${task.title}</h3>
    <p>\${task.owner} · \${task.status} · \${task.due}</p>
    <div class="task-actions">
      <button type="button" data-action="edit">Redigera</button>
      <button type="button" data-action="delete">Ta bort</button>
    </div>
  </li>\`).join("");
}

// TODO: koppla formulär, sökning, filter, lagring och säker import.
renderTasks();`;

const DRAFT_KEYS = {
  html: "opsv-playground:requirements-shift:html:v1",
  css: "opsv-playground:requirements-shift:css:v1",
  js: "opsv-playground:requirements-shift:js:v1",
};

function readAgentFiles(value: unknown): AgentFiles {
  if (!value || typeof value !== "object") throw new Error("Filen innehåller ingen giltig agentsession.");
  const session = value as { schema?: unknown; version?: unknown; challenge?: { slug?: unknown }; files?: Partial<AgentFiles> };
  if (session.schema !== "opsv-agent-session" || session.version !== 1 || session.challenge?.slug !== "requirements-shift") throw new Error("Filen tillhör inte Kravskiftets agentläge.");
  const files = session.files;
  if (!files || typeof files.html !== "string" || typeof files.css !== "string" || typeof files.js !== "string") throw new Error("Agentsessionen saknar HTML, CSS eller JavaScript.");
  if (files.html.length > 12_000 || files.css.length > 12_000 || files.js.length > 12_000) throw new Error("Minst en fil är större än den tillåtna gränsen på 12 000 tecken.");
  if (files.html.includes("\0") || files.css.includes("\0") || files.js.includes("\0")) throw new Error("Agentsessionen innehåller otillåtna nolltecken.");
  return { html:files.html, css:files.css, js:files.js };
}

function sanitizeMarkup(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(?:html|head|body|iframe|object|embed|link|meta|base|svg|math)\b[^>]*>/gi, "")
    .replace(/\s(?:on\w+|src|srcdoc|action|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\shref\s*=\s*(?:"(?!#)[^"]*"|'(?!#)[^']*'|(?!#)[^\s>]+)/gi, "");
}

function sanitizeCss(value: string) {
  return value
    .replace(/@import[^;]+;?/gi, "")
    .replace(/url\([^)]*\)/gi, "none")
    .replace(/expression\([^)]*\)/gi, "")
    .replace(/<\/style/gi, "");
}

function sanitizeScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function createAuditScript(nonce: string, css: string) {
  const hasFocusStyle = /:(?:focus|focus-visible)\b/i.test(css);
  return `<script>
  setTimeout(async () => {
    const pause = () => new Promise(resolve => setTimeout(resolve, 30));
    const results = [];
    const add = (id, passed, detail = "") => results.push({ id, passed: Boolean(passed), detail });
    const visible = element => Boolean(element && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden" && !element.hidden);
    const cards = () => [...document.querySelectorAll(".task-card")];
    const setValue = (element, value) => {
      if (!element) return;
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const click = element => element && element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    const form = document.querySelector("#task-form");
    const list = document.querySelector("#task-list");
    const title = document.querySelector('[name="title"]');
    const owner = document.querySelector('[name="owner"]');
    const status = document.querySelector('[name="status"]');
    const due = document.querySelector('[name="due"]');
    add("structure", form && list && title && owner && status && due, window.__opsvRuntimeError || "");
    await pause();
    const initialCount = cards().length;
    add("initial", initialCount >= 2 && cards().every(card => card.dataset.taskId && card.dataset.status));

    let created = null;
    try {
      setValue(title, "Planera årsmöte"); setValue(owner, "Mira"); setValue(status, "todo"); setValue(due, "2026-12-01");
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await pause();
      created = cards().find(card => card.textContent.includes("Planera årsmöte"));
      add("add", cards().length === initialCount + 1 && created);
    } catch (error) { add("add", false, String(error)); }

    try {
      click(created?.querySelector('[data-action="edit"]')); await pause();
      const loaded = title?.value === "Planera årsmöte";
      setValue(title, "Planera årsmötet klart");
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await pause();
      created = cards().find(card => card.textContent.includes("Planera årsmötet klart"));
      add("edit", loaded && created);
    } catch (error) { add("edit", false, String(error)); }

    try {
      const deleteTarget = created;
      click(deleteTarget?.querySelector('[data-action="delete"]')); await pause();
      add("delete", Boolean(deleteTarget) && cards().length === initialCount && !cards().some(card => card.textContent.includes("Planera årsmötet klart")));
    } catch (error) { add("delete", false, String(error)); }

    const search = document.querySelector("#task-search");
    try {
      const firstText = cards()[0]?.querySelector(".task-title")?.textContent?.trim() || "Boka";
      setValue(search, "INGEN-UPPGIFT-MATCHAR"); await pause();
      const noneVisible = cards().filter(visible).length === 0;
      const emptyVisible = visible(document.querySelector(".empty-state"));
      setValue(search, firstText.slice(0, 4).toLowerCase()); await pause();
      add("search", noneVisible && cards().filter(visible).length >= 1);
      add("empty", noneVisible && emptyVisible);
    } catch (error) { add("search", false, String(error)); add("empty", false, String(error)); }

    const filter = document.querySelector("#status-filter");
    try {
      setValue(search, ""); setValue(filter, "done"); await pause();
      const shown = cards().filter(visible);
      add("status", shown.length >= 1 && shown.every(card => card.dataset.status === "done"));
      setValue(filter, "all"); await pause();
    } catch (error) { add("status", false, String(error)); }
    add("storage", Number(window.__opsvStorageWrites || 0) > 0);

    const importData = document.querySelector("#import-data");
    const importButton = document.querySelector("#import-button");
    const message = document.querySelector("#status-message");
    try {
      setValue(importData, "{trasig-json"); click(importButton); await pause();
      add("invalid-json", Boolean(message?.textContent?.trim()) && Boolean(document.querySelector("#task-list")));
    } catch (error) { add("invalid-json", false, String(error)); }

    try {
      const payload = JSON.stringify([{ id:"xss", title:"<img src=x onerror=alert(1)>", owner:"Test", status:"todo", due:"2026-12-01" }]);
      setValue(importData, payload); click(importButton); await pause();
      add("xss", Boolean(list?.textContent?.includes("<img src=x onerror=alert(1)>")) && !list?.querySelector("img,script,iframe,svg"));
    } catch (error) { add("xss", false, String(error)); }

    const controls = [...document.querySelectorAll("input, select, textarea")];
    const labelled = controls.length > 0 && controls.every(control => control.closest("label") || (control.id && document.querySelector('label[for="' + CSS.escape(control.id) + '"]')));
    add("a11y", labelled && ${JSON.stringify(hasFocusStyle)});
    const targets = [...document.querySelectorAll("input, select, textarea, button")].map(element => element.getBoundingClientRect().height);
    add("mobile", document.documentElement.scrollWidth <= innerWidth && targets.length > 0 && targets.every(height => height >= 40));
    parent.postMessage({ type:"opsv-requirements-audit", nonce:${JSON.stringify(nonce)}, results }, "*");
  }, 180);
  </script>`;
}

function createPreview(markup: string, css: string, script: string, auditNonce?: string) {
  const safeMarkup = sanitizeMarkup(markup);
  const safeCss = sanitizeCss(css);
  const safeScript = sanitizeScript(script);
  const auditScript = auditNonce ? createAuditScript(auditNonce, safeCss) : "";
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; navigate-to 'none'"><style>${safeCss}</style><script>
  (() => {
    const blocked = () => { throw new Error("Nätverk och externa resurser är blockerade i utmaningen."); };
    for (const name of ["fetch","XMLHttpRequest","WebSocket","EventSource","Worker","SharedWorker","BroadcastChannel","indexedDB","caches","open"]) {
      try { Object.defineProperty(window, name, { value:blocked, writable:false, configurable:false }); } catch {}
    }
    try { Object.defineProperty(navigator, "sendBeacon", { value:blocked, writable:false, configurable:false }); } catch {}
    const values = Object.create(null);
    Object.defineProperty(window, "__opsvStorageWrites", { value:0, writable:true });
    Object.defineProperty(window, "challengeStorage", { value:Object.freeze({
      getItem:key => Object.prototype.hasOwnProperty.call(values,String(key)) ? values[String(key)] : null,
      setItem:(key,value) => { values[String(key)] = String(value); window.__opsvStorageWrites += 1; },
      removeItem:key => { delete values[String(key)]; window.__opsvStorageWrites += 1; },
      clear:() => { for (const key of Object.keys(values)) delete values[key]; window.__opsvStorageWrites += 1; }
    }), writable:false, configurable:false });
    window.__opsvRuntimeError = "";
    addEventListener("error", event => { window.__opsvRuntimeError = event.message || "Körfel"; });
  })();
  </script></head><body>${safeMarkup}<script>${safeScript}</script>${auditScript}</body></html>`;
}

export function RequirementsShiftWorkspace({ challengeId, challengeSlug, canSubmit }: { challengeId: string; challengeSlug: string; canSubmit: boolean }) {
  const [markup, setMarkup] = useState(STARTER_HTML);
  const [css, setCss] = useState(STARTER_CSS);
  const [script, setScript] = useState(STARTER_JS);
  const [tab, setTab] = useState<FileTab>("html");
  const [device, setDevice] = useState<Device>("mobile");
  const [unlockedRound, setUnlockedRound] = useState<1 | 2 | 3>(1);
  const [results, setResults] = useState<AuditResult[] | null>(null);
  const [auditNonce, setAuditNonce] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const agentImportRef = useRef<HTMLInputElement>(null);
  const draftReadyRef = useRef(false);
  const deferredMarkup = useDeferredValue(markup);
  const deferredCss = useDeferredValue(css);
  const deferredScript = useDeferredValue(script);
  const preview = useMemo(() => createPreview(deferredMarkup, deferredCss, deferredScript, auditNonce ?? undefined), [deferredMarkup, deferredCss, deferredScript, auditNonce]);

  useEffect(() => {
    const loadDraft = window.setTimeout(() => {
      const savedHtml = window.localStorage.getItem(DRAFT_KEYS.html);
      const savedCss = window.localStorage.getItem(DRAFT_KEYS.css);
      const savedJs = window.localStorage.getItem(DRAFT_KEYS.js);
      if (savedHtml) setMarkup(savedHtml);
      if (savedCss) setCss(savedCss);
      if (savedJs) setScript(savedJs);
      draftReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(loadDraft);
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const saveDraft = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEYS.html, markup);
      window.localStorage.setItem(DRAFT_KEYS.css, css);
      window.localStorage.setItem(DRAFT_KEYS.js, script);
    }, 300);
    return () => window.clearTimeout(saveDraft);
  }, [markup, css, script]);

  useEffect(() => {
    if (!auditNonce) return;
    const timeout = window.setTimeout(() => {
      setRunning(false);
      setAuditNonce(null);
      setResults(TESTS.map((test) => ({ ...test, passed:false, detail:"Testkörningen svarade inte. Kontrollera att koden inte blockerar sidan." })));
    }, 2500);
    const receiveAudit = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.type !== "opsv-requirements-audit" || event.data?.nonce !== auditNonce) return;
      window.clearTimeout(timeout);
      const runtime = new Map<string, RuntimeResult>((event.data.results as RuntimeResult[]).map((result) => [result.id, result]));
      const nextResults = TESTS.map((test) => ({ ...test, passed:Boolean(runtime.get(test.id)?.passed), detail:runtime.get(test.id)?.detail }));
      const roundOneComplete = nextResults.filter((test) => test.round === 1).every((test) => test.passed);
      const roundTwoComplete = nextResults.filter((test) => test.round <= 2).every((test) => test.passed);
      setResults(nextResults);
      setUnlockedRound(roundTwoComplete ? 3 : roundOneComplete ? 2 : 1);
      setRunning(false);
      setAuditNonce(null);
    };
    window.addEventListener("message", receiveAudit);
    return () => { window.clearTimeout(timeout); window.removeEventListener("message", receiveAudit); };
  }, [auditNonce]);

  function runAudit() {
    setDevice("mobile");
    setRunning(true);
    setResults(null);
    setAuditNonce(crypto.randomUUID());
  }

  function resetDraft() {
    Object.values(DRAFT_KEYS).forEach((key) => window.localStorage.removeItem(key));
    setMarkup(STARTER_HTML); setCss(STARTER_CSS); setScript(STARTER_JS);
    setTab("html"); setDevice("mobile"); setUnlockedRound(1); setResults(null); setAuditNonce(null); setRunning(false); setAgentStatus(null);
  }

  function exportAgentSession() {
    const session = {
      schema:"opsv-agent-session",
      version:1,
      challenge:{ id:challengeId, slug:challengeSlug, title:"Kravskiftet" },
      brief:{
        objective:"Bygg en säker, responsiv och tangentbordsanvändbar uppgiftstavla som klarar alla tre kravrundor.",
        rounds:ROUNDS.map((round) => ({ number:round.number, label:round.label, title:round.title, requirements:round.copy })),
        rules:[
          "Ändra endast sessionens html-, css- och js-filer.",
          "Behåll angivna id:n, fältnamn och data-attribut så att Playground kan testa lösningen.",
          "Använd challengeStorage för lokal lagring.",
          "Rendera användar- och importdata som text, aldrig som betrodd HTML.",
          "MCP-serverns förhandskontroll är vägledande. Playground kör alltid om de riktiga testerna efter import.",
        ],
        verification:"Importera samma JSON-fil tillbaka i Playground. Deltagaren granskar, kör 13 webbläsartester och skickar själv in lösningen efter Discord-inloggning.",
      },
      files:{ html:markup, css, js:script },
      metadata:{ source:window.location.href, exportedAt:new Date().toISOString(), revision:0 },
    };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(session, null, 2)}\n`], { type:"application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "opsv-006-kravskiftet-agent.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setAgentStatus("AGENTSESSIONEN ÄR EXPORTERAD. MCP-SERVERN FÅR ENDAST ÄNDRA DEN FILEN.");
  }

  async function importAgentSession(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 80_000) throw new Error("Agentsessionen får vara högst 80 kB.");
      const files = readAgentFiles(JSON.parse(await file.text()) as unknown);
      setMarkup(files.html); setCss(files.css); setScript(files.js);
      setTab("html"); setDevice("mobile"); setUnlockedRound(1); setResults(null); setAuditNonce(null); setRunning(false);
      setAgentStatus("LÖSNINGEN ÄR IMPORTERAD. KÖR PLAYGROUNDS RIKTIGA TESTER INNAN INSKICKNING.");
    } catch (error) {
      setAgentStatus(`IMPORTEN STOPPADES: ${error instanceof Error ? error.message : "Okänt filfel."}`);
    }
  }

  const activeValue = tab === "html" ? markup : tab === "css" ? css : script;
  const setActiveValue = (value: string) => tab === "html" ? setMarkup(value) : tab === "css" ? setCss(value) : setScript(value);
  const passed = results?.filter((result) => result.passed).length ?? 0;
  const complete = passed === TESTS.length;
  const visibleResults = results?.filter((result) => result.round <= unlockedRound) ?? null;
  const submission = `HTML\n${markup}\n\nCSS\n${css}\n\nJAVASCRIPT\n${script}`;

  return <div className="requirements-workspace">
    <header className="workspace-header"><div><span className="eyebrow">ARBETSYTA / KRAVSKIFTET</span><h2>Bygg. Ändra. Härda.</h2></div><div className="workspace-safety"><i aria-hidden="true" />SANDBOX · INGET NÄTVERK · LOKAL KÖRNING</div></header>

    <section className="requirements-rounds" aria-label="Kravrundor">{ROUNDS.map((round) => {
      const locked = round.number > unlockedRound;
      const roundResults = results?.filter((result) => result.round === round.number);
      const roundPassed = roundResults?.filter((result) => result.passed).length ?? 0;
      return <article key={round.number} className={`${locked ? "is-locked" : "is-active"} ${roundResults?.every((result) => result.passed) ? "is-passed" : ""}`}>
        <header><span>0{round.number}</span><b>{locked ? "LÅST" : roundResults ? `${roundPassed} / ${roundResults.length}` : "ÖPPEN"}</b></header>
        <span className="eyebrow">{round.label}</span><h3>{round.title}</h3><p>{locked ? "Klara föregående kravrunda för att öppna briefen." : round.copy}</p>
      </article>;
    })}</section>

    <details className="agent-bridge">
      <summary><span><b>AGENTLÄGE / MCP</b><small>TESTVERSION · LOKAL · INGA API-NYCKLAR TILL OPSV</small></span><i aria-hidden="true">+</i></summary>
      <div className="agent-bridge-body">
        <div className="agent-bridge-copy"><span className="eyebrow">KOPPLA DIN EGEN KODAGENT</span><h3>Agenten arbetar i en enda fil.</h3><p>Exportera sessionen och den fristående MCP-servern. Konfigurera din agent med de två absoluta filsökvägarna. När agenten är klar importerar du samma JSON-fil och låter Playground köra de riktiga testerna.</p><div className="agent-safety"><span>INGET NÄTVERK</span><span>INGEN KODEXEKVERING</span><span>INGEN DISCORD- ELLER DATABASÅTKOMST</span></div></div>
        <ol className="agent-steps">
          <li><span>01</span><div><strong>Exportera session</strong><small>Brief, regler och dina tre nuvarande filer.</small></div><button type="button" onClick={exportAgentSession}>LADDA NER JSON ↓</button></li>
          <li><span>02</span><div><strong>Hämta MCP-servern</strong><small>En fristående Node-fil byggd med officiella MCP-SDK:n.</small></div><a href="/agent/opsv-agent-mcp.mjs" download>LADDA NER MCP ↓</a></li>
          <li><span>03</span><div><strong>Koppla agenten</strong><small>Använd Node 20+ och ersätt sökvägarna med dina egna.</small></div><pre>{`{
  "mcpServers": {
    "opsv-playground": {
      "command": "node",
      "args": ["/PATH/opsv-agent-mcp.mjs", "/PATH/opsv-006-kravskiftet-agent.json"]
    }
  }
}`}</pre></li>
          <li><span>04</span><div><strong>Importera resultatet</strong><small>Endast HTML, CSS och JS läses in. Poäng och metadata ignoreras.</small></div><button type="button" onClick={() => agentImportRef.current?.click()}>VÄLJ JSON ↑</button><input ref={agentImportRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importAgentSession} /></li>
        </ol>
        <footer><div><a href="/agent/README.md" target="_blank" rel="noreferrer">FULLSTÄNDIGA INSTRUKTIONER ↗</a><a href="/agent/opsv-agent-mcp.source.ts" download>GRANSKA KÄLLKOD ↓</a></div>{agentStatus ? <p role="status">{agentStatus}</p> : <p>MCP-SERVERN KAN INTE SKICKA IN BIDRAG ELLER SÄTTA POÄNG.</p>}</footer>
      </div>
    </details>

    <div className="requirements-grid">
      <section className="ui-editor-panel" aria-label="HTML-, CSS- och JavaScript-editor">
        <div className="ui-editor-tabs" role="tablist" aria-label="Kodfil">
          {(["html","css","js"] as FileTab[]).map((file) => <button key={file} type="button" role="tab" aria-selected={tab === file} onClick={() => setTab(file)}>{file === "html" ? "INDEX.HTML" : file === "css" ? "STYLES.CSS" : "APP.JS"}</button>)}
          <button className="ui-reset" type="button" onClick={resetDraft}>ÅTERSTÄLL</button>
        </div>
        <CodeEditor className="ui-code-editor requirements-editor" value={activeValue} onChange={setActiveValue} language={(tab === "js" ? "javascript" : tab) as CodeLanguage} ariaLabel={`${tab.toUpperCase()} för Kravskiftet`} maxLength={12_000} />
        <div className="ui-editor-note">{tab === "js" ? "KODEN KÖRS I EN ISOLERAD IFRAME · FETCH OCH EXTERNA API:ER ÄR BLOCKERADE" : "EXTERNA RESURSER OCH FARLIG MARKUP TAS BORT AUTOMATISKT"}</div>
      </section>

      <section className="preview-panel" aria-label="Förhandsvisning">
        <div className="preview-toolbar"><span>FÖRHANDSVISNING</span><div className="device-switch" role="group" aria-label="Förhandsvisningens bredd"><button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>360</button><button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>DESKTOP</button></div></div>
        <div className="preview-stage"><div className={`preview-device preview-${device}`}><iframe ref={iframeRef} title="Förhandsvisning av uppgiftstavlan" sandbox="allow-forms allow-scripts" srcDoc={preview} /></div></div>
        <div className="preview-status"><span>{running ? "KÖR 13 KONTROLLER…" : `RUNDA ${unlockedRound} AV 3`}</span><span>challengeStorage · LOKALT OCH AVGRÄNSAT</span></div>
      </section>
    </div>

    <div className="audit-actions"><div><span className="eyebrow">AUTOMATISK PRODUKTKONTROLL</span><p>Testar riktiga klick, formulärflöden, filter, import, säker rendering, mobilbredd och tangentbordsgrund.</p></div><button className="run-button" type="button" onClick={runAudit} disabled={running}>{running ? "TESTAR…" : `TESTA RUNDA ${unlockedRound}`} <b aria-hidden="true">↗</b></button></div>

    <section className="test-console requirements-audit" aria-live="polite" aria-busy={running}>
      <header><span>KRAVRESULTAT</span><div>{results ? `${passed} / 13 GODKÄNDA` : "REDO ATT TESTA"}<strong>{results ? `${passed * 100} P` : "—"}</strong></div></header>
      {running ? <div className="console-empty"><i />KÖR APPEN I MOBIL SANDBOX…</div> : visibleResults ? <ol className="test-list">{visibleResults.map((result, index) => <li key={result.id} className={result.passed ? "test-passed" : "test-failed"}><span>{String(index + 1).padStart(2,"0")}</span><div><strong>{result.name}</strong>{!result.passed ? <small>{result.detail || result.hint}</small> : null}</div><em>RUNDA {result.round}</em><b>{result.passed ? "GODKÄND" : "ÅTGÄRDA"}</b></li>)}</ol> : <div className="console-empty">Börja med första briefen. När fem grundflöden fungerar öppnas nästa kravskifte.</div>}
    </section>

    {results ? <section className={`workspace-submit ${complete ? "is-complete" : ""}`}><div><span className="eyebrow">{complete ? "13 / 13 KRAV GODKÄNDA" : `RUNDA ${unlockedRound} PÅGÅR`}</span><h3>{complete ? "Produkten håller." : `${13 - passed} kontroller kvar.`}</h3><p>{complete ? "Alla funktionella, responsiva och säkerhetsrelaterade kontroller är godkända. Poängen publiceras automatiskt när du skickar in." : unlockedRound < 3 ? "Klara den aktiva rundan för att få nästa ändrade brief." : "Arbeta igenom de markerade kantfallen och testa igen."}</p></div>{complete ? canSubmit ? <form action={submitChallenge}><input type="hidden" name="challengeId" value={challengeId} /><input type="hidden" name="challengeSlug" value={challengeSlug} /><input type="hidden" name="content" value={submission} /><input type="hidden" name="claimedScore" value="1300" /><button className="button button-dark" type="submit">SKICKA IN 1 300 P <span>→</span></button></form> : <a className="button button-dark" href="/login?reason=participation">LOGGA IN MED DISCORD <span>→</span></a> : <button className="button button-dark" type="button" onClick={runAudit}>TESTA IGEN <span>↻</span></button>}</section> : null}
  </div>;
}
