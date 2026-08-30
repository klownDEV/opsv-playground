"use client";

import { useEffect, useRef, useState } from "react";
import { submitChallenge } from "@/lib/actions";
import { CodeEditor } from "@/components/code-editor";

type TestResult = {
  name: string;
  passed: boolean;
  group: "Publikt test" | "Kantfall";
  message?: string;
};

type RunResult = {
  tests: TestResult[];
  score: number;
  duration: number;
  error?: string;
};

const STARTER_CODE = `function findProduct(products, id) {
  return products.find(
    (product) => product.id.toLowerCase() === id.toLowerCase()
  );
}

function searchProducts(products, query) {
  return products
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((product) => product.name.includes(query));
}

function reserveStock(product, quantity) {
  product.stock -= quantity;
  return product;
}

function basketTotal(products, lines) {
  return lines.reduce((sum, line) => {
    const product = findProduct(products, line.productId);
    return sum + Math.round((product.priceOre / 100) * line.quantity) * 100;
  }, 0);
}`;

const WORKER_SOURCE = `
const send = self.postMessage.bind(self);
const blocked = () => { throw new Error("Nätverk och externa resurser är blockerade i testmiljön."); };
const lock = (name, value) => {
  try { Object.defineProperty(self, name, { value, writable: false, configurable: false }); }
  catch { try { self[name] = value; } catch {} }
};

["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches"].forEach((name) => lock(name, blocked));
lock("postMessage", blocked);
lock("close", blocked);

const products = () => [
  { id: "SE-01", name: "Blå mugg", priceOre: 1295, stock: 3 },
  { id: "se-02", name: "Anteckningsbok", priceOre: 4990, stock: 8 },
];
const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

self.onmessage = ({ data }) => {
  const started = performance.now();
  const results = [];
  const run = (name, group, test) => {
    try {
      test();
      results.push({ name, group, passed: true });
    } catch (error) {
      results.push({ name, group, passed: false, message: error instanceof Error ? error.message : String(error) });
    }
  };
  const expect = (condition, message) => { if (!condition) throw new Error(message); };

  try {
    const factory = new Function('"use strict";\\n' + data.code + '\\nreturn { findProduct, searchProducts, reserveStock, basketTotal };');
    const api = factory();
    const { findProduct, searchProducts, reserveStock, basketTotal } = api;
    expect([findProduct, searchProducts, reserveStock, basketTotal].every((item) => typeof item === "function"), "Alla fyra funktioner måste finnas kvar.");

    run("Jämför produkt-id exakt", "Publikt test", () => expect(findProduct(products(), "se-01") === undefined, "SE-01 och se-01 ska inte räknas som samma id."));
    run("Saknat id ger undefined", "Publikt test", () => expect(findProduct(products(), "SE-99") === undefined, "Ett saknat id ska ge undefined."));
    run("Sökning trimmar och ignorerar skiftläge", "Publikt test", () => expect(equal(searchProducts(products(), "  MUGG ").map((p) => p.id), ["SE-01"]), "Förväntade träffen SE-01."));
    run("Sökning ändrar inte originallistan", "Publikt test", () => { const input = products(); const before = structuredClone(input); searchProducts(input, "a"); expect(equal(input, before), "Indatan ändrades av searchProducts."); });
    run("Lagersaldo får inte bli negativt", "Publikt test", () => { let threw = false; try { reserveStock(products()[0], 4); } catch { threw = true; } expect(threw, "För stort uttag ska kasta ett fel."); });
    run("Totalsumma räknas exakt i ören", "Publikt test", () => expect(basketTotal(products(), [{ productId: "SE-01", quantity: 3 }]) === 3885, "3 × 1295 ska bli 3885 öre."));

    run("Lageruttag kräver positivt heltal", "Kantfall", () => { for (const quantity of [0, -1, 1.5]) { let threw = false; try { reserveStock(products()[0], quantity); } catch { threw = true; } expect(threw, "Ogiltigt antal accepterades: " + quantity); } });
    run("Lageruttag är immutable", "Kantfall", () => { const product = products()[0]; const before = structuredClone(product); const updated = reserveStock(product, 2); expect(equal(product, before), "Originalprodukten ändrades."); expect(updated.stock === 1, "Det nya lagersaldot ska vara 1."); });
    run("Sökresultat sorteras utan mutation", "Kantfall", () => { const input = products(); const result = searchProducts(input, ""); expect(equal(result.map((p) => p.id), ["se-02", "SE-01"]), "Tom sökning ska ge en alfabetiskt sorterad kopia."); expect(input[0].id === "SE-01", "Originalordningen ändrades."); });
    run("Varukorg hanterar flera rader", "Kantfall", () => { const input = products(); const before = structuredClone(input); const total = basketTotal(input, [{ productId: "SE-01", quantity: 2 }, { productId: "se-02", quantity: 1 }]); expect(total === 7580, "Förväntade totalsumman 7580 öre."); expect(equal(input, before), "Produktlistan ändrades."); });

    const score = results.reduce((sum, result) => sum + (result.passed ? (result.group === "Publikt test" ? 100 : 200) : 0), 0);
    send({ tests: results, score, duration: Math.round(performance.now() - started) });
  } catch (error) {
    send({ tests: results, score: 0, duration: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) });
  }
};`;

const DRAFT_KEY = "opsv-playground:broken-api:v1";
const MAX_SCORE = 1400;

export function CodeChallengeWorkspace({
  challengeId,
  challengeSlug,
  canSubmit,
}: {
  challengeId: string;
  challengeSlug: string;
  canSubmit: boolean;
}) {
  const [code, setCode] = useState(STARTER_CODE);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const draftLoadedRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    const loadDraft = window.setTimeout(() => {
      if (saved) setCode(saved);
      draftLoadedRef.current = true;
    }, 0);
    return () => {
      window.clearTimeout(loadDraft);
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!draftLoadedRef.current) return;
    const timeout = window.setTimeout(() => window.localStorage.setItem(DRAFT_KEY, code), 250);
    return () => window.clearTimeout(timeout);
  }, [code]);

  function runTests() {
    workerRef.current?.terminate();
    setRunning(true);
    setResult(null);

    const blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);
    workerRef.current = worker;

    const timeout = window.setTimeout(() => {
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
      setResult({ tests: [], score: 0, duration: 1500, error: "Körningen avbröts efter 1,5 sekunder. Kontrollera oändliga loopar." });
    }, 1500);

    worker.onmessage = ({ data }: MessageEvent<RunResult>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
      setResult(data);
    };
    worker.onerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
      setResult({ tests: [], score: 0, duration: 0, error: "Koden kunde inte tolkas. Kontrollera syntaxen och försök igen." });
    };
    worker.postMessage({ code });
  }

  function resetDraft() {
    workerRef.current?.terminate();
    workerRef.current = null;
    window.localStorage.removeItem(DRAFT_KEY);
    setCode(STARTER_CODE);
    setResult(null);
    setRunning(false);
  }

  const passed = result?.tests.filter((test) => test.passed).length ?? 0;
  const allPassed = result?.score === MAX_SCORE;

  return (
    <div className="code-workspace">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">ARBETSYTA / LOKAL KÖRNING</span>
          <h2>Laga koden här.</h2>
        </div>
        <div className="workspace-safety"><i aria-hidden="true" />ISOLERAD I DIN WEBBLÄSARE</div>
      </header>

      <div className="workspace-grid">
        <section className="workspace-brief" aria-labelledby="workspace-brief-title">
          <div className="workspace-file"><span>UPPGIFT</span><strong id="workspace-brief-title">catalog.js</strong></div>
          <p>Fyra funktioner bryter mot kontraktet. Laga dem utan att ändra funktionsnamnen.</p>
          <ul>
            <li><span>01</span>Exakta produkt-id:n</li>
            <li><span>02</span>Förlåtande sökning</li>
            <li><span>03</span>Säkra lageruttag</li>
            <li><span>04</span>Exakta belopp i ören</li>
          </ul>
          <div className="workspace-limit"><strong>10</strong><span>TESTER<br />1,5 S MAXTID</span></div>
        </section>

        <section className="editor-panel" aria-label="Kodeditor">
          <div className="editor-toolbar">
            <div><span className="editor-dot" />catalog.js <small>AUTOSPARAD LOKALT</small></div>
            <button type="button" onClick={resetDraft}>ÅTERSTÄLL</button>
          </div>
          <CodeEditor className="code-editor" value={code} onChange={setCode} language="javascript" ariaLabel="Din lösning i JavaScript" />
          <div className="editor-actions">
            <span>INGET NÄTVERK · INGA SERVERHEMLIGHETER</span>
            <button className="run-button" type="button" onClick={runTests} disabled={running}>
              {running ? "KÖR…" : "KÖR TESTER"}<b aria-hidden="true">▶</b>
            </button>
          </div>
        </section>
      </div>

      <section className="test-console" aria-live="polite" aria-busy={running}>
        <header>
          <span>TESTRESULTAT</span>
          <div>{result ? `${passed} / 10 GODKÄNDA` : "REDO ATT KÖRA"}<strong>{result ? `${result.score} P` : "—"}</strong></div>
        </header>
        {running ? (
          <div className="console-empty"><i />KÖR LÖSNINGEN I EN SEPARAT MILJÖ…</div>
        ) : result?.error ? (
          <p className="console-error" role="alert">{result.error}</p>
        ) : result ? (
          <ol className="test-list">
            {result.tests.map((test, index) => (
              <li key={test.name} className={test.passed ? "test-passed" : "test-failed"}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{test.name}</strong>{test.message ? <small>{test.message}</small> : null}</div>
                <em>{test.group}</em><b>{test.passed ? "GODKÄND" : "MISSLYCKAD"}</b>
              </li>
            ))}
          </ol>
        ) : (
          <div className="console-empty">Kör testerna när du är redo. Du får direkt återkoppling på varje kontraktskrav.</div>
        )}
      </section>

      {result ? (
        <section className={`workspace-submit ${allPassed ? "is-complete" : ""}`}>
          <div>
            <span className="eyebrow">{allPassed ? "ALLT GRÖNT" : "FORTSÄTT BYGGA"}</span>
            <h3>{allPassed ? "Lösningen håller." : `${MAX_SCORE - result.score} poäng kvar.`}</h3>
            <p>{allPassed ? "Du har klarat alla publika tester och kantfall. Skicka in lösningen för automatisk rättning." : "Läs felmeddelandena, justera koden och kör igen. Ditt utkast finns kvar i den här webbläsaren."}</p>
          </div>
          {allPassed ? (
            canSubmit ? (
              <form action={submitChallenge}>
                <input type="hidden" name="challengeId" value={challengeId} />
                <input type="hidden" name="challengeSlug" value={challengeSlug} />
                <input type="hidden" name="content" value={code} />
                <input type="hidden" name="claimedScore" value={result.score} />
                <button className="button button-dark" type="submit">SKICKA IN {result.score} P <span>→</span></button>
              </form>
            ) : <a className="button button-dark" href="/login?reason=participation">LOGGA IN MED DISCORD <span>→</span></a>
          ) : <button className="button button-dark" type="button" onClick={runTests}>KÖR IGEN <span>↻</span></button>}
        </section>
      ) : null}

    </div>
  );
}
