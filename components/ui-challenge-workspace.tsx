"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { submitChallenge } from "@/lib/actions";
import { CodeEditor } from "@/components/code-editor";

type AuditResult = { name: string; passed: boolean; hint: string };
type PreviewMetrics = { overflow: boolean; minTarget: number };

const STARTER_MARKUP = `<main class="wrap">
  <h1>Checkout</h1>
  <form id="checkout">
    <div class="columns">
      <section class="box">
        <h2>Kund</h2>
        <label>Namn<input name="name" required></label>
        <label>E-post<input name="email" type="email" required></label>
        <label><input name="company" type="checkbox"> Företag</label>
        <label>Organisationsnummer<input name="org"></label>
      </section>
      <section class="box">
        <h2>Leverans</h2>
        <label><input name="shipping" type="radio" value="standard" checked> Standard, 49 kr</label>
        <label><input name="shipping" type="radio" value="express"> Express, 129 kr</label>
        <h2>Betalning</h2>
        <label>Metod<select name="payment"><option value="card">Kort</option><option value="invoice">Faktura</option></select></label>
        <label>Kortnummer<input name="card" inputmode="numeric"></label>
      </section>
    </div>
    <p class="error" id="error"></p>
    <div class="actions"><a href="#">Tillbaka</a><button class="pay" type="submit">Betala nu</button></div>
  </form>
</main>`;

const STARTER_CSS = `* { box-sizing: border-box; }
body { margin: 0; font: 14px Arial; background: #ddd; color: #777; }
.wrap { width: 920px; margin: 70px auto; background: #eee; padding: 10px; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.box { background: #f4f4f4; border: 1px solid #ccc; padding: 8px; }
label { display: inline; font-size: 11px; }
input, select { width: 100%; height: 27px; border: 0; margin: 2px 0 5px; }
.actions { display: flex; justify-content: space-between; }
.pay { background: #c7d0c7; color: #aab2aa; border: 0; padding: 8px; font-size: 11px; }
.error { color: #aaa; font-size: 10px; }
@media (max-width: 600px) { .wrap { margin: 50px 0; width: 760px; } }`;

const HTML_KEY = "opsv-playground:ui-rescue:html:v1";
const CSS_KEY = "opsv-playground:ui-rescue:css:v1";

function sanitizeMarkup(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(?:html|head|body|iframe|object|embed|link|meta|base)\b[^>]*>/gi, "")
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

function createPreview(markup: string, css: string) {
  const safeMarkup = sanitizeMarkup(markup);
  const safeCss = sanitizeCss(css);
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>${safeCss}</style></head><body>${safeMarkup}<script>
  const form = document.querySelector('#checkout');
  if (form) form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const error = document.querySelector('#error');
    if (!error) return;
    if (data.get('company') && !data.get('org')) { error.textContent = 'Fyll i organisationsnummer.'; return; }
    if (data.get('payment') === 'card' && !data.get('card')) { error.textContent = 'Fyll i kortnummer.'; return; }
    error.textContent = 'Klart! Din beställning är redo.';
  });
  </script></body></html>`;
}

function inferPreviewMetrics(css: string): PreviewMetrics {
  const fixedWidths = [...css.matchAll(/(?:^|[;{])\s*(?:min-)?width\s*:\s*(\d+)px/gi)].map((match) => Number(match[1]));
  const targetHeights: number[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(?:input|select|button|\.pay|\ba\b)/i.test(match[1])) continue;
    for (const height of match[2].matchAll(/(?:min-)?height\s*:\s*(\d+)px/gi)) targetHeights.push(Number(height[1]));
  }
  return {
    overflow: fixedWidths.some((width) => width > 360),
    minTarget: targetHeights.length ? Math.max(...targetHeights) : 0,
  };
}

function hasLabel(control: Element, doc: Document) {
  return Boolean(control.closest("label") || (control.id && doc.querySelector(`label[for="${CSS.escape(control.id)}"]`)));
}

function audit(markup: string, css: string, metrics: PreviewMetrics): AuditResult[] {
  const doc = new DOMParser().parseFromString(sanitizeMarkup(markup), "text/html");
  const requiredNames = ["name", "email", "company", "org", "shipping", "payment", "card"];
  const controls = [...doc.querySelectorAll("input, select")];
  const shipping = doc.querySelector('input[name="shipping"]');
  const error = doc.querySelector("#error");
  const hasLargeFixedWidth = /(?:^|[;{])\s*width\s*:\s*(?:6\d\d|[7-9]\d\d|\d{4,})px/i.test(css);

  return [
    { name: "Alla ursprungliga fält finns kvar", passed: requiredNames.every((name) => doc.querySelector(`[name="${name}"]`)), hint: "Behåll namn, e-post, företag, org.nr, leverans, betalningsmetod och kortnummer." },
    { name: "Varje kontroll har en etikett", passed: controls.length > 0 && controls.every((control) => hasLabel(control, doc)), hint: "Koppla label till varje input och select genom inneslutning eller for/id." },
    { name: "Leveransvalet är grupperat", passed: Boolean(shipping?.closest("fieldset")?.querySelector("legend")), hint: "Samla radioknapparna i fieldset med en beskrivande legend." },
    { name: "Felmeddelandet meddelas automatiskt", passed: Boolean(error?.getAttribute("role") === "alert" || error?.hasAttribute("aria-live")), hint: "Ge #error role=alert eller aria-live så hjälpmedel hör felet." },
    { name: "Obligatoriska uppgifter är markerade", passed: Boolean(doc.querySelector('input[name="name"][required]') && doc.querySelector('input[name="email"][required][type="email"]')), hint: "Behåll required och rätt typ på namn och e-post." },
    { name: "Tydlig struktur och betalningsknapp", passed: Boolean(doc.querySelector("h1") && doc.querySelector('button[type="submit"]')), hint: "Sidan behöver en huvudrubrik och en riktig submit-knapp." },
    { name: "Synligt tangentbordsfokus", passed: /:(?:focus|focus-visible)\b/i.test(css), hint: "Lägg till en tydlig :focus-visible-stil." },
    { name: "Inga låsta desktopbredder", passed: !hasLargeFixedWidth, hint: "Ersätt fasta bredder över 600 px med width:100% och max-width." },
    { name: "Ingen sidledsskroll vid 360 px", passed: !metrics.overflow, hint: "Förhandsvisningen är bredare än mobilen. Kontrollera grid, width och padding." },
    { name: "Grundklickytor är minst 40 px", passed: metrics.minTarget >= 40, hint: `Största deklarerade grundhöjd är ${metrics.minTarget || 0} px. Ange minst 40 px för formulärkontroller och knappar.` },
  ];
}

export function UiChallengeWorkspace({
  challengeId,
  challengeSlug,
  canSubmit,
}: {
  challengeId: string;
  challengeSlug: string;
  canSubmit: boolean;
}) {
  const [markup, setMarkup] = useState(STARTER_MARKUP);
  const [css, setCss] = useState(STARTER_CSS);
  const [tab, setTab] = useState<"html" | "css">("html");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [results, setResults] = useState<AuditResult[] | null>(null);
  const draftReadyRef = useRef(false);
  const deferredMarkup = useDeferredValue(markup);
  const deferredCss = useDeferredValue(css);
  const preview = useMemo(() => createPreview(deferredMarkup, deferredCss), [deferredMarkup, deferredCss]);
  const metrics = useMemo(() => inferPreviewMetrics(deferredCss), [deferredCss]);

  useEffect(() => {
    const savedMarkup = window.localStorage.getItem(HTML_KEY);
    const savedCss = window.localStorage.getItem(CSS_KEY);
    const loadDraft = window.setTimeout(() => {
      if (savedMarkup) setMarkup(savedMarkup);
      if (savedCss) setCss(savedCss);
      draftReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(loadDraft);
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const saveDraft = window.setTimeout(() => {
      window.localStorage.setItem(HTML_KEY, markup);
      window.localStorage.setItem(CSS_KEY, css);
    }, 300);
    return () => window.clearTimeout(saveDraft);
  }, [markup, css]);

  function runAudit() {
    setResults(audit(markup, css, metrics));
  }

  function resetDraft() {
    window.localStorage.removeItem(HTML_KEY);
    window.localStorage.removeItem(CSS_KEY);
    setMarkup(STARTER_MARKUP);
    setCss(STARTER_CSS);
    setResults(null);
    setTab("html");
    setDevice("mobile");
  }

  const score = results?.filter((result) => result.passed).length ?? 0;
  const complete = score === 10;
  const submission = `HTML\n${markup}\n\nCSS\n${css}`;

  return (
    <div className="ui-workspace">
      <header className="workspace-header">
        <div><span className="eyebrow">ARBETSYTA / UI-RÄDDNING</span><h2>Gör flödet mänskligt.</h2></div>
        <div className="workspace-safety"><i aria-hidden="true" />SANDBOX UTAN NÄTVERK</div>
      </header>

      <div className="ui-workspace-grid">
        <section className="ui-editor-panel" aria-label="HTML- och CSS-editor">
          <div className="ui-editor-tabs" role="tablist" aria-label="Kodfil">
            <button type="button" role="tab" aria-selected={tab === "html"} onClick={() => setTab("html")}>INDEX.HTML</button>
            <button type="button" role="tab" aria-selected={tab === "css"} onClick={() => setTab("css")}>STYLES.CSS</button>
            <button className="ui-reset" type="button" onClick={resetDraft}>ÅTERSTÄLL</button>
          </div>
          <CodeEditor
            className="ui-code-editor"
            value={tab === "html" ? markup : css}
            onChange={tab === "html" ? setMarkup : setCss}
            language={tab}
            ariaLabel={tab === "html" ? "HTML för checkout" : "CSS för checkout"}
          />
          <div className="ui-editor-note">{tab === "html" ? "SKRIPT OCH EXTERNA RESURSER TAS BORT AUTOMATISKT" : "@IMPORT OCH URL-RESURSER ÄR BLOCKERADE"}</div>
        </section>

        <section className="preview-panel" aria-label="Förhandsvisning">
          <div className="preview-toolbar">
            <span>FÖRHANDSVISNING</span>
            <div className="device-switch" role="group" aria-label="Förhandsvisningens bredd">
              <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>360</button>
              <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>DESKTOP</button>
            </div>
          </div>
          <div className="preview-stage">
            <div className={`preview-device preview-${device}`}>
              <iframe title="Förhandsvisning av din checkout" sandbox="allow-forms allow-scripts" srcDoc={preview} />
            </div>
          </div>
          <div className="preview-status"><span>{metrics.overflow ? "SIDLEDSSKROLL UPPTÄCKT" : "BREDD GODKÄND"}</span><span>DEKLARERAD KLICKYTA {metrics.minTarget || 0} PX</span></div>
        </section>
      </div>

      <div className="audit-actions">
        <div><span className="eyebrow">AUTOMATISK UX-KONTROLL</span><p>Kontrollen mäter struktur, formulärsemantik, mobilbredd, fokus och klickytor.</p></div>
        <button className="run-button" type="button" onClick={runAudit}>KONTROLLERA <b aria-hidden="true">↗</b></button>
      </div>

      <section className="test-console ui-audit" aria-live="polite">
        <header><span>BEDÖMNING</span><div>{results ? `${score} / 10 GODKÄNDA` : "REDO ATT KONTROLLERA"}<strong>{results ? `${score * 10} P` : "—"}</strong></div></header>
        {results ? <ol className="test-list">{results.map((result, index) => <li key={result.name} className={result.passed ? "test-passed" : "test-failed"}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{result.name}</strong>{!result.passed ? <small>{result.hint}</small> : null}</div><em>10 POÄNG</em><b>{result.passed ? "GODKÄND" : "ÅTGÄRDA"}</b></li>)}</ol> : <div className="console-empty">Börja i mobilvyn. Behåll alla funktioner, förbättra semantiken och gör checkouten begriplig vid 360 px.</div>}
      </section>

      {results ? <section className={`workspace-submit ${complete ? "is-complete" : ""}`}>
        <div><span className="eyebrow">{complete ? "REDO ATT SKICKA IN" : "FORTSÄTT FÖRBÄTTRA"}</span><h3>{complete ? "Checkouten håller." : `${10 - score} kontroller kvar.`}</h3><p>{complete ? "Den automatiska kontrollen är godkänd. Poängen publiceras direkt när du skickar in." : "Arbeta igenom de markerade förbättringarna och kontrollera på nytt."}</p></div>
        {complete ? canSubmit ? <form action={submitChallenge}><input type="hidden" name="challengeId" value={challengeId} /><input type="hidden" name="challengeSlug" value={challengeSlug} /><input type="hidden" name="content" value={submission} /><input type="hidden" name="claimedScore" value="100" /><button className="button button-dark" type="submit">SKICKA IN 100 P <span>→</span></button></form> : <a className="button button-dark" href="/login?reason=participation">LOGGA IN MED DISCORD <span>→</span></a> : <button className="button button-dark" type="button" onClick={runAudit}>KONTROLLERA IGEN <span>↻</span></button>}
      </section> : null}

    </div>
  );
}
