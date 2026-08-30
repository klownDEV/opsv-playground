"use client";
import { useMemo, useState } from "react";
import { ChallengeRow } from "./challenge-row";
import type { Challenge } from "@/lib/data";

const categories = ["Alla", "Kodning", "AI", "Agenter", "UI / UX", "Optimering"];
const difficulties = ["Alla", "Lätt", "Medel", "Svår", "Extrem"];
const statuses = ["Alla", "Öppen", "Utvald", "Ny", "Kommer snart"];

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="filters"><span className="filter-label">{label} /</span>{options.map((option) => <button className={`filter-option ${value === option ? "active" : ""}`} type="button" onClick={() => onChange(option)} key={option}>{option}</button>)}</div>;
}

export function ChallengeCatalog({ items }: { items: Challenge[] }) {
  const [category, setCategory] = useState("Alla"); const [difficulty, setDifficulty] = useState("Alla"); const [status, setStatus] = useState("Alla");
  const filtered = useMemo(() => items.filter((item) =>
    (category === "Alla" || item.category.includes(category)) && (difficulty === "Alla" || item.difficulty === difficulty) && (status === "Alla" || item.status === status)
  ), [items, category, difficulty, status]);
  return <><div className="catalog-filters"><FilterGroup label="Kategori" options={categories} value={category} onChange={setCategory}/><FilterGroup label="Svårighet" options={difficulties} value={difficulty} onChange={setDifficulty}/><FilterGroup label="Status" options={statuses} value={status} onChange={setStatus}/></div><div className="dark-list">{filtered.map((item, index) => <ChallengeRow key={item.slug} challenge={item} index={index + 1}/>)}{filtered.length === 0 && <p className="empty-state">Inga utmaningar matchar den här kombinationen.</p>}</div></>;
}
