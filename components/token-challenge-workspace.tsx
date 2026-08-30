"use client";

import { useEffect, useRef, useState } from "react";
import { submitChallenge } from "@/lib/actions";
import { CodeEditor } from "@/components/code-editor";

type ExtractionResult = { id: string; passed: boolean; actual?: Record<string, unknown>; mismatches?: string[]; error?: string };
type RunResult = { results: ExtractionResult[]; score: number; tokens: number; duration: number; error?: string };

const DOCUMENTS = [
  { id: "d01", text: "NORD FORM AB | FAKTURA NF-1048 | att betala 12 490,00 kr | förfallodag 2026-09-14" },
  { id: "d02", text: "Invoice: CLD/7781\nCloud Harbor Ltd\nTotal EUR 840.50\nPayment due 30 Sep 2026" },
  { id: "d03", text: "Kvitto? nej — faktura 2026-88 från Södra Data HB. Summa: 7.200 SEK. Betala senast: 2026/10/02" },
  { id: "d04", text: "ACME Tools, invoice US-991; amount due $1,249.99; due date October 5, 2026" },
  { id: "d05", text: "Leverantör: Pixelverket AB ::: ID PV-00031 ::: TOTALT INKL MOMS 999,00 SEK ::: 2026-09-01" },
  { id: "d06", text: "Rechnung EU44-19 / Fjord Büro GmbH / fällig 18.09.2026 / Gesamt 3.410,75 EUR" },
  { id: "d07", text: "Invoice from North Stack Oy\nNo. NS-71\nDue: 2026-11-11\nSEK 18 004.20" },
  { id: "d08", text: "Studio Null AB\tFakturanr: SN—502\tBelopp 450 kr\tSista betalningsdag 26-09-28" },
  { id: "d09", text: "USD invoice BETA-17 | Beta Research Inc | total 75.00 | due 2026-12-31" },
  { id: "d10", text: "Öresund Media AB\nFA 9007\nFörfaller: 15 oktober 2026\nAtt erlägga: SEK 6 300,50" },
];

const STARTER_CODE = `function extractInvoice(text) {
  // Returnera exakt dessa fem fält för varje dokument.
  return {
    invoice_id: "",
    supplier: "",
    currency: "SEK",
    total: 0,
    due_date: ""
  };
}`;

const WORKER_SOURCE = `
const send = self.postMessage.bind(self);
const blocked = () => { throw new Error("Nätverk och externa resurser är blockerade i testmiljön."); };
const lock = (name, value) => { try { Object.defineProperty(self, name, { value, writable: false, configurable: false }); } catch { try { self[name] = value; } catch {} } };
["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts","Worker","SharedWorker","BroadcastChannel","indexedDB","caches"].forEach((name) => lock(name, blocked));
lock("postMessage", blocked); lock("close", blocked);
const docs = ${JSON.stringify(DOCUMENTS)};
const expected = [
  { invoice_id:"NF-1048", supplier:"NORD FORM AB", currency:"SEK", total:12490, due_date:"2026-09-14" },
  { invoice_id:"CLD/7781", supplier:"Cloud Harbor Ltd", currency:"EUR", total:840.5, due_date:"2026-09-30" },
  { invoice_id:"2026-88", supplier:"Södra Data HB", currency:"SEK", total:7200, due_date:"2026-10-02" },
  { invoice_id:"US-991", supplier:"ACME Tools", currency:"USD", total:1249.99, due_date:"2026-10-05" },
  { invoice_id:"PV-00031", supplier:"Pixelverket AB", currency:"SEK", total:999, due_date:"2026-09-01" },
  { invoice_id:"EU44-19", supplier:"Fjord Büro GmbH", currency:"EUR", total:3410.75, due_date:"2026-09-18" },
  { invoice_id:"NS-71", supplier:"North Stack Oy", currency:"SEK", total:18004.2, due_date:"2026-11-11" },
  { invoice_id:"SN—502", supplier:"Studio Null AB", currency:"SEK", total:450, due_date:"2026-09-28" },
  { invoice_id:"BETA-17", supplier:"Beta Research Inc", currency:"USD", total:75, due_date:"2026-12-31" },
  { invoice_id:"FA 9007", supplier:"Öresund Media AB", currency:"SEK", total:6300.5, due_date:"2026-10-15" }
];
const tokenCount = (value) => (value.match(/[\\p{L}\\p{N}_]+|[^\\s]/gu) || []).length;
self.onmessage = ({ data }) => {
  const started = performance.now();
  try {
    const factory = new Function('"use strict";\\n' + data.code + '\\nreturn { extractInvoice };');
    const { extractInvoice } = factory();
    if (typeof extractInvoice !== "function") throw new Error("Funktionen extractInvoice(text) måste finnas kvar.");
    const results = docs.map((doc, index) => {
      try {
        const actual = extractInvoice(doc.text);
        if (!actual || typeof actual !== "object" || Array.isArray(actual)) return { id:doc.id, passed:false, error:"Funktionen måste returnera ett objekt." };
        const target = expected[index];
        const mismatches = Object.keys(target).filter((key) => key === "total" ? Math.abs(Number(actual[key]) - target[key]) > 0.001 : String(actual[key] ?? "").trim() !== String(target[key]));
        return { id:doc.id, passed:mismatches.length === 0, actual, mismatches };
      } catch (error) { return { id:doc.id, passed:false, error:error instanceof Error ? error.message : String(error) }; }
    });
    const tokens = tokenCount(data.code);
    const score = results.every((result) => result.passed) ? Math.max(0, 20000 - tokens) : 0;
    send({ results, tokens, score, duration:Math.round(performance.now() - started) });
  } catch (error) { send({ results:[], tokens:tokenCount(data.code), score:0, duration:Math.round(performance.now() - started), error:error instanceof Error ? error.message : String(error) }); }
};`;

const DRAFT_KEY = "opsv-playground:token-miser:v1";

function countTokens(value: string) { return value.match(/[\p{L}\p{N}_]+|[^\s]/gu)?.length ?? 0; }

export function TokenChallengeWorkspace({ challengeId, challengeSlug, canSubmit }: { challengeId: string; challengeSlug: string; canSubmit: boolean }) {
  const [code, setCode] = useState(STARTER_CODE);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(0);
  const draftReadyRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    const loadDraft = window.setTimeout(() => { if (saved) setCode(saved); draftReadyRef.current = true; }, 0);
    return () => { window.clearTimeout(loadDraft); workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const saveDraft = window.setTimeout(() => window.localStorage.setItem(DRAFT_KEY, code), 250);
    return () => window.clearTimeout(saveDraft);
  }, [code]);

  function runTests() {
    workerRef.current?.terminate();
    setRunning(true); setResult(null);
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type:"text/javascript" }));
    const worker = new Worker(url); URL.revokeObjectURL(url); workerRef.current = worker;
    const timeout = window.setTimeout(() => { worker.terminate(); workerRef.current = null; setRunning(false); setResult({ results:[], tokens:countTokens(code), score:0, duration:1500, error:"Körningen stoppades efter 1,5 sekunder." }); }, 1500);
    worker.onmessage = ({ data }: MessageEvent<RunResult>) => { window.clearTimeout(timeout); worker.terminate(); workerRef.current = null; setRunning(false); setResult(data); };
    worker.onerror = () => { window.clearTimeout(timeout); worker.terminate(); workerRef.current = null; setRunning(false); setResult({ results:[], tokens:countTokens(code), score:0, duration:0, error:"Koden kunde inte tolkas. Kontrollera syntaxen." }); };
    worker.postMessage({ code });
  }

  function resetDraft() { workerRef.current?.terminate(); workerRef.current = null; window.localStorage.removeItem(DRAFT_KEY); setCode(STARTER_CODE); setResult(null); setRunning(false); setSelectedDoc(0); }
  const passed = result?.results.filter((item) => item.passed).length ?? 0;
  const complete = passed === DOCUMENTS.length;
  const activeResult = result?.results[selectedDoc];

  return <div className="token-workspace">
    <header className="workspace-header"><div><span className="eyebrow">ARBETSYTA / DATAEXTRAKTION</span><h2>Alla fält. Minsta möjliga kod.</h2></div><div className="workspace-safety"><i aria-hidden="true" />ISOLERAD WORKER · INGET NÄTVERK</div></header>
    <div className="token-workspace-grid">
      <section className="editor-panel token-editor" aria-label="Extraktionseditor">
        <div className="editor-toolbar"><div><span className="editor-dot" />extract-invoice.js <small>AUTOSPARAD LOKALT</small></div><button type="button" onClick={resetDraft}>ÅTERSTÄLL</button></div>
        <CodeEditor className="code-editor" value={code} onChange={setCode} language="javascript" ariaLabel="Din extraktionsfunktion i JavaScript" />
        <div className="editor-actions"><span>{countTokens(code)} KÄLLKODSTOKENS · 1,5 S MAXTID</span><button className="run-button" type="button" onClick={runTests} disabled={running}>{running ? "KÖR…" : "KÖR 10 DOKUMENT"}<b aria-hidden="true">▶</b></button></div>
      </section>
      <aside className="document-panel">
        <header><span>DOKUMENT</span><strong>{String(selectedDoc + 1).padStart(2,"0")} / 10</strong></header>
        <div className="document-tabs">{DOCUMENTS.map((doc,index) => <button key={doc.id} type="button" aria-pressed={selectedDoc === index} onClick={() => setSelectedDoc(index)}>{doc.id.toUpperCase()}<i className={result ? result.results[index]?.passed ? "doc-pass" : "doc-fail" : undefined} /></button>)}</div>
        <div className="document-copy"><span className="eyebrow">RÅTEXT</span><pre>{DOCUMENTS[selectedDoc].text}</pre></div>
        <div className="document-output"><span className="eyebrow">DIN OUTPUT</span>{activeResult ? activeResult.error ? <p className="console-error">{activeResult.error}</p> : <><pre>{JSON.stringify(activeResult.actual,null,2)}</pre>{activeResult.mismatches?.length ? <p>FEL FÄLT: {activeResult.mismatches.join(", ")}</p> : <p className="output-pass">ALLA FÄLT MATCHAR</p>}</> : <p>Kör funktionen för att se resultatet för dokumentet.</p>}</div>
      </aside>
    </div>
    <section className="test-console token-results" aria-live="polite" aria-busy={running}><header><span>EXTRAKTIONSRESULTAT</span><div>{result ? `${passed} / 10 GODKÄNDA` : "REDO ATT KÖRA"}<strong>{result ? `${result.score} P` : "—"}</strong></div></header>{running ? <div className="console-empty"><i />KÖR DOKUMENTEN I EN SEPARAT MILJÖ…</div> : result?.error ? <p className="console-error" role="alert">{result.error}</p> : result ? <ol className="token-result-list">{result.results.map((item,index) => <li key={item.id} className={item.passed ? "test-passed" : "test-failed"}><button type="button" onClick={() => setSelectedDoc(index)}><span>{item.id.toUpperCase()}</span><b>{item.passed ? "GODKÄND" : item.error ? "KÖRFEL" : `${item.mismatches?.length ?? 0} FEL`}</b></button></li>)}</ol> : <div className="console-empty">Returnera exakt invoice_id, supplier, currency, total och due_date för samtliga dokument.</div>}</section>
    {result ? <section className={`workspace-submit ${complete ? "is-complete" : ""}`}><div><span className="eyebrow">{complete ? "10 / 10 DOKUMENT" : "EXTRAKTIONEN ÄR INTE KLAR"}</span><h3>{complete ? `${result.tokens} tokens. ${result.score} poäng.` : `${10 - passed} dokument kvar.`}</h3><p>{complete ? "Alla dokument matchar facit. Poängen räknas om automatiskt när du skickar in." : "Välj ett misslyckat dokument för att se vilka fält som skiljer sig."}</p></div>{complete ? canSubmit ? <form action={submitChallenge}><input type="hidden" name="challengeId" value={challengeId} /><input type="hidden" name="challengeSlug" value={challengeSlug} /><input type="hidden" name="content" value={code} /><input type="hidden" name="claimedScore" value={result.score} /><button className="button button-dark" type="submit">SKICKA IN {result.score} P <span>→</span></button></form> : <a className="button button-dark" href="/login?reason=participation">LOGGA IN MED DISCORD <span>→</span></a> : <button className="button button-dark" type="button" onClick={runTests}>KÖR IGEN <span>↻</span></button>}</section> : null}
  </div>;
}
