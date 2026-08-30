"use client";

import { useEffect, useRef, useState } from "react";
import { submitChallenge } from "@/lib/actions";
import { countSourceTokens, PROMPT_CASES, REFERENCE_PROMPT, simulatePrompt, type SimulationResult } from "@/lib/challenges/prompt-grader";

const DRAFT_KEY = "opsv-playground:prompt-compression:v1";

export function PromptChallengeWorkspace({ challengeId, challengeSlug, canSubmit }: { challengeId: string; challengeSlug: string; canSubmit: boolean }) {
  const [prompt, setPrompt] = useState(REFERENCE_PROMPT);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const draftReadyRef = useRef(false);
  const tokens = countSourceTokens(prompt);
  const passed = results?.filter((result) => result.passed).length ?? 0;
  const complete = passed === PROMPT_CASES.length;
  const score = complete && tokens > 0 ? Math.round(100_000 / tokens) : 0;

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    const loadDraft = window.setTimeout(() => {
      if (saved) setPrompt(saved);
      draftReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(loadDraft);
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const saveDraft = window.setTimeout(() => window.localStorage.setItem(DRAFT_KEY, prompt), 250);
    return () => window.clearTimeout(saveDraft);
  }, [prompt]);

  function runSimulation() {
    setResults(simulatePrompt(prompt));
  }

  function resetPrompt() {
    window.localStorage.removeItem(DRAFT_KEY);
    setPrompt(REFERENCE_PROMPT);
    setResults(null);
  }

  return <div className="prompt-workspace">
    <header className="workspace-header"><div><span className="eyebrow">ARBETSYTA / PROMPTSIMULATOR</span><h2>Behåll beteendet. Kapa resten.</h2></div><div className="workspace-safety"><i aria-hidden="true" />LOKAL SIMULATOR · INGET MODELL-API</div></header>
    <div className="prompt-grid">
      <section className="prompt-editor-panel" aria-label="Prompteditor">
        <div className="editor-toolbar"><div><span className="editor-dot" />system-prompt.txt <small>AUTOSPARAD LOKALT</small></div><button type="button" onClick={resetPrompt}>ÅTERSTÄLL</button></div>
        <textarea className="prompt-editor" value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Din systemprompt" spellCheck={false} maxLength={5000} />
        <div className="prompt-stats"><span><strong>{tokens}</strong> TOKENS</span><span><strong>{prompt.length}</strong> TECKEN</span><span><strong>{complete ? score : "—"}</strong> POÄNG</span></div>
      </section>
      <aside className="prompt-brief">
        <span className="eyebrow">UPPDRAG</span><h3>12 ärenden.<br />Tre beslut.</h3>
        <p>Komprimera instruktionen utan att tappa JSON-format, kategori, prioritet eller svarsspråk.</p>
        <div className="prompt-contract"><span>category</span><b>billing · account · technical · other</b><span>priority</span><b>high · normal</b><span>reply_language</span><b>sv · en</b></div>
        <p className="simulator-note">Simulatorn testar uttryckta beteenden deterministiskt. Den är inte en språkmodell och gör inga externa anrop.</p>
        <button className="run-button" type="button" onClick={runSimulation}>KÖR 12 FALL <b aria-hidden="true">▶</b></button>
      </aside>
    </div>
    <section className="test-console prompt-results" aria-live="polite">
      <header><span>SIMULERADE RESULTAT</span><div>{results ? `${passed} / 12 GODKÄNDA` : "REDO ATT KÖRA"}<strong>{results ? `${score} P` : "—"}</strong></div></header>
      {results ? <ol className="prompt-case-list">{results.map((result) => <li key={result.id} className={result.passed ? "test-passed" : "test-failed"}><span>{result.id}</span><p>{result.message}</p><code>{result.actual ? JSON.stringify(result.actual) : "OGILTIG OUTPUT"}</code><b>{result.passed ? "GODKÄND" : "MISSLYCKAD"}</b>{result.reason ? <small>{result.reason}</small> : null}</li>)}</ol> : <div className="console-empty">Referensprompten klarar alla fall. Korta den stegvis och kör om efter varje ändring.</div>}
    </section>
    {results ? <section className={`workspace-submit ${complete ? "is-complete" : ""}`}><div><span className="eyebrow">{complete ? "12 / 12 BETEENDEN KVAR" : "PROMPTEN TAPPADE BETEENDEN"}</span><h3>{complete ? `${tokens} tokens. ${score} poäng.` : `${12 - passed} fall kvar.`}</h3><p>{complete ? "Fortsätt gärna komprimera eller skicka in prompten för automatisk rättning." : "Läs de misslyckade fallen och återinför de regler som saknas."}</p></div>{complete ? canSubmit ? <form action={submitChallenge}><input type="hidden" name="challengeId" value={challengeId} /><input type="hidden" name="challengeSlug" value={challengeSlug} /><input type="hidden" name="content" value={prompt} /><input type="hidden" name="claimedScore" value={score} /><button className="button button-dark" type="submit">SKICKA IN {score} P <span>→</span></button></form> : <a className="button button-dark" href="/login?reason=participation">LOGGA IN MED DISCORD <span>→</span></a> : <button className="button button-dark" type="button" onClick={runSimulation}>KÖR IGEN <span>↻</span></button>}</section> : null}
  </div>;
}
