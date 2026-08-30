export type SupportCase = {
  id: string;
  message: string;
  expected: {
    category: "billing" | "account" | "technical" | "other";
    priority: "high" | "normal";
    reply_language: "sv" | "en";
  };
};

export type SimulationResult = SupportCase & {
  actual: SupportCase["expected"] | null;
  passed: boolean;
  reason?: string;
};

export const PROMPT_CASES: SupportCase[] = [
  { id: "01", message: "Jag blev debiterad två gånger i går.", expected: { category: "billing", priority: "high", reply_language: "sv" } },
  { id: "02", message: "Var hittar jag min senaste faktura?", expected: { category: "billing", priority: "normal", reply_language: "sv" } },
  { id: "03", message: "I cannot sign in after resetting my password.", expected: { category: "account", priority: "high", reply_language: "en" } },
  { id: "04", message: "Hur byter jag e-postadress på kontot?", expected: { category: "account", priority: "normal", reply_language: "sv" } },
  { id: "05", message: "Exportknappen ger bara ett tomt felmeddelande.", expected: { category: "technical", priority: "normal", reply_language: "sv" } },
  { id: "06", message: "The entire service is unavailable for our team.", expected: { category: "technical", priority: "high", reply_language: "en" } },
  { id: "07", message: "Kan ni lägga till stöd för mörkt läge?", expected: { category: "other", priority: "normal", reply_language: "sv" } },
  { id: "08", message: "Someone changed my account name and I do not recognize it.", expected: { category: "account", priority: "high", reply_language: "en" } },
  { id: "09", message: "När kommer återbetalningen?", expected: { category: "billing", priority: "normal", reply_language: "sv" } },
  { id: "10", message: "Appen kraschar men webbversionen fungerar.", expected: { category: "technical", priority: "normal", reply_language: "sv" } },
  { id: "11", message: "Thanks, everything works now!", expected: { category: "other", priority: "normal", reply_language: "en" } },
  { id: "12", message: "Ett köp jag aldrig gjort syns på kortet.", expected: { category: "billing", priority: "high", reply_language: "sv" } },
];

export const REFERENCE_PROMPT = `Du klassificerar svenska supportärenden. Svara alltid med exakt ett giltigt JSON-objekt och ingen annan text. Objektet ska ha exakt nycklarna "category", "priority" och "reply_language". category ska vara en av "billing", "account", "technical" eller "other". priority ska vara "high" om användaren inte kan använda tjänsten, om pengar dragits felaktigt eller om kontot verkar kapat; annars "normal". reply_language ska vara "sv" när meddelandet huvudsakligen är svenska och "en" när det huvudsakligen är engelska. Använd "billing" för betalningar, fakturor och återbetalningar; "account" för inloggning, lösenord och kontouppgifter; "technical" för fel, avbrott och trasiga funktioner; annars "other".`;

export function countSourceTokens(value: string) {
  return value.match(/[\p{L}\p{N}_]+|[^\s]/gu)?.length ?? 0;
}

function includesAny(value: string, expressions: RegExp[]) {
  return expressions.some((expression) => expression.test(value));
}

export function simulatePrompt(prompt: string): SimulationResult[] {
  const normalized = prompt.toLocaleLowerCase("sv-SE");
  const hasJson = /json/.test(normalized) && ["category", "priority", "reply_language"].every((key) => normalized.includes(key));
  const hasValues = ["billing", "account", "technical", "other", "high", "normal", "sv", "en"].every((value) => normalized.includes(value));
  const billing = includesAny(normalized, [/betal/, /faktur/, /återbetal/, /debiter/, /billing/]);
  const account = includesAny(normalized, [/konto/, /inlogg/, /lösenord/, /account/, /sign.?in/, /password/]);
  const technical = includesAny(normalized, [/tekn/, /fel/, /avbrott/, /krasch/, /funktion/, /technical/, /unavailable/]);
  const language = includesAny(normalized, [/språk/, /language/, /svenska/, /engelska/, /reply_language/]);
  const highMoney = includesAny(normalized, [/peng.*fel/, /dragits.*fel/, /debiter/, /köp.*aldrig/, /unauthori/]);
  const highAccount = includesAny(normalized, [/kapat/, /kapad/, /obehör/, /någon.*ändra/, /someone changed/, /compromis/]);
  const highUnavailable = includesAny(normalized, [/inte kan använda/, /kan inte logga/, /otillgäng/, /unavailable/, /cannot sign/, /cannot use/]);

  return PROMPT_CASES.map((item) => {
    if (!hasJson || !hasValues) return { ...item, actual: null, passed: false, reason: "Utdataformatet eller de tillåtna värdena saknas i prompten." };
    const category = item.expected.category === "billing" ? (billing ? "billing" : "other") : item.expected.category === "account" ? (account ? "account" : "other") : item.expected.category === "technical" ? (technical ? "technical" : "other") : "other";
    const needsHighRule = item.id === "01" || item.id === "12" ? highMoney : item.id === "03" || item.id === "06" ? highUnavailable : item.id === "08" ? highAccount : true;
    const priority = item.expected.priority === "high" && needsHighRule ? "high" : "normal";
    const reply_language = language ? item.expected.reply_language : "sv";
    const actual = { category, priority, reply_language } as SupportCase["expected"];
    const passed = actual.category === item.expected.category && actual.priority === item.expected.priority && actual.reply_language === item.expected.reply_language;
    return { ...item, actual, passed, reason: passed ? undefined : "En klassificerings-, prioriterings- eller språkregel saknas." };
  });
}

export function gradePrompt(prompt: string) {
  const results = simulatePrompt(prompt);
  const passed = results.filter((result) => result.passed).length;
  const tokens = countSourceTokens(prompt);
  return { passed, tokens, complete: passed === PROMPT_CASES.length, score: passed === PROMPT_CASES.length && tokens > 0 ? Math.round(100_000 / tokens) : 0 };
}
