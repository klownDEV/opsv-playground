"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export type CodeLanguage = "javascript" | "html" | "css";

const opsvHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.controlKeyword, tags.tagName], color: "#d9ff2f" },
  { tag: [tags.string, tags.special(tags.string)], color: "#e8bd6a" },
  { tag: [tags.number, tags.bool, tags.null], color: "#8cc8ff" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#6f6f68", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: "#f1f1e8" },
  { tag: [tags.attributeName, tags.propertyName], color: "#9fc7ff" },
  { tag: [tags.typeName, tags.className], color: "#ef8faa" },
  { tag: [tags.punctuation, tags.bracket], color: "#aaa9a1" },
]);

const opsvTheme = EditorView.theme({
  "&": {
    height: "100%",
    minHeight: "inherit",
    backgroundColor: "transparent",
    color: "#e8e8df",
    fontFamily: "var(--mono)",
    fontSize: "inherit",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { minHeight: "inherit", fontFamily: "var(--mono)", lineHeight: "1.7", overflow: "auto" },
  ".cm-content": { minHeight: "100%", padding: "1.25rem 0", caretColor: "var(--acid)" },
  ".cm-line": { padding: "0 1.25rem 0 .75rem" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--acid)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "#0b0b0a", color: "#55554f", border: "0", paddingLeft: ".35rem" },
  ".cm-activeLineGutter": { backgroundColor: "#171714", color: "var(--acid)" },
  ".cm-activeLine": { backgroundColor: "rgba(217,255,47,.035)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "rgba(217,255,47,.2) !important" },
  ".cm-matchingBracket": { backgroundColor: "rgba(217,255,47,.15)", color: "var(--acid)", outline: "1px solid rgba(217,255,47,.45)" },
  ".cm-foldPlaceholder": { backgroundColor: "#242420", border: "0", color: "#aaa9a1" },
  ".cm-panels": { backgroundColor: "#171714", color: "#e8e8df" },
  ".cm-searchMatch": { backgroundColor: "rgba(232,189,106,.28)", outline: "1px solid rgba(232,189,106,.7)" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgba(217,255,47,.25)" },
});

function languageExtension(language: CodeLanguage) {
  if (language === "html") return html();
  if (language === "css") return css();
  return javascript();
}

export function CodeEditor({
  value,
  onChange,
  language,
  ariaLabel,
  className = "",
  maxLength = 50_000,
}: {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  ariaLabel: string;
  className?: string;
  maxLength?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!rootRef.current) return;
    const view = new EditorView({
      parent: rootRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          basicSetup,
          languageExtension(language),
          indentUnit.of("  "),
          keymap.of([indentWithTab]),
          syntaxHighlighting(opsvHighlightStyle),
          opsvTheme,
          EditorState.changeFilter.of((transaction) => transaction.newDoc.length <= maxLength),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel, spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel, language, maxLength]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={rootRef} className={`code-mirror-editor ${className}`.trim()} />;
}
