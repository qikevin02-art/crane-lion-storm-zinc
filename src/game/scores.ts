export type ScoreEntry = {
  name: string;
  score: number;
  wave: number;
  at: number;
};

export type Settings = {
  muted: boolean;
  shake: boolean | null;
  name: string;
};

const SCORE_KEY = "yajing-dawang-scores-v1";
const SET_KEY = "yajing-dawang-settings-v1";
const MAX_BOARD = 8;

const DEFAULT_SETTINGS: Settings = { muted: false, shake: null, name: "雅静" };

export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 8);
  return cleaned || "雅静";
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { version?: number; list?: ScoreEntry[] };
    if (!data || !Array.isArray(data.list)) return [];
    return data.list
      .filter(
        (row) =>
          row &&
          typeof row.name === "string" &&
          typeof row.score === "number" &&
          typeof row.wave === "number" &&
          typeof row.at === "number",
      )
      .slice(0, MAX_BOARD);
  } catch {
    return [];
  }
}

export function upsertScore(entry: ScoreEntry): ScoreEntry[] {
  const list = loadScores().filter((row) => row.at !== entry.at);
  list.push({ ...entry, name: sanitizeName(entry.name) });
  list.sort((a, b) => b.score - a.score || a.at - b.at);
  const top = list.slice(0, MAX_BOARD);
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify({ version: 1, list: top }));
  } catch {
    /* ignore quota */
  }
  return top;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SET_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      muted: Boolean(data.muted),
      shake: typeof data.shake === "boolean" ? data.shake : null,
      name: sanitizeName(typeof data.name === "string" ? data.name : "雅静"),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next: Settings) {
  try {
    localStorage.setItem(
      SET_KEY,
      JSON.stringify({ ...next, name: sanitizeName(next.name), version: 1 }),
    );
  } catch {
    /* ignore quota */
  }
}
