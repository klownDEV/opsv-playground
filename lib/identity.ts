export function normalizePlaygroundName(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

export function resolveDiscordDisplayName(displayName: string | null | undefined, username: string) {
  return displayName?.trim() || username;
}

export function suggestPlaygroundName(displayName: string | null | undefined, username: string) {
  const displayNameSuggestion = normalizePlaygroundName(resolveDiscordDisplayName(displayName, username)).slice(0, 24).replace(/-$/, "");
  if (displayNameSuggestion.length >= 3) return displayNameSuggestion;
  return normalizePlaygroundName(username).slice(0, 24).replace(/-$/, "");
}
