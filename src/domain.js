export const SCHEMA_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dayKey, amount) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return todayKey(date);
}

export function uid(prefix = "id") {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId ? `${prefix}-${cryptoId}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createInitialState(quotes = []) {
  const today = todayKey();
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      name: "",
      waterGoalMl: 2500,
      theme: "dark-red",
      createdAt: new Date().toISOString()
    },
    tasks: [],
    daily: {},
    workouts: [],
    notes: [],
    quotes,
    quoteHistory: {},
    favorites: {
      quotes: []
    },
    ui: {
      lastOpenedDay: today,
      ouroborosSeenFor: []
    }
  };
}

export function tasksForDay(state, dayKey) {
  return state.tasks.filter((task) => task.dayKey === dayKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isVictoriousDay(tasks) {
  return tasks.length > 0 && tasks.every((task) => task.completed);
}

export function calculateStreak(victoryDays, referenceDay = todayKey()) {
  const wins = new Set(victoryDays);
  let streak = 0;
  let cursor = referenceDay;
  while (wins.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(victoryDays) {
  const ordered = [...new Set(victoryDays)].sort();
  let best = 0;
  let current = 0;
  let previous = null;

  for (const day of ordered) {
    current = previous && addDays(previous, 1) === day ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }

  return best;
}

export function getVictoryDays(state) {
  return Object.entries(state.daily)
    .filter(([, day]) => day.victorious)
    .map(([dayKey]) => dayKey);
}

export function summarizeDay(state, dayKey) {
  const tasks = tasksForDay(state, dayKey);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const daily = state.daily[dayKey] || {};
  return {
    dayKey,
    totalTasks: tasks.length,
    completedTasks,
    victorious: Boolean(daily.victorious),
    waterMl: daily.waterMl || 0,
    resistedSugar: Boolean(daily.resistedSugar),
    resistedUltraProcessed: Boolean(daily.resistedUltraProcessed),
    resistedFastFood: Boolean(daily.resistedFastFood),
    workouts: state.workouts.filter((workout) => workout.dayKey === dayKey).length,
    notes: state.notes.filter((note) => note.updatedAt?.startsWith(dayKey) || note.createdAt?.startsWith(dayKey)).length
  };
}

export function upsertDailyFromTasks(state, dayKey) {
  const tasks = tasksForDay(state, dayKey);
  const victorious = isVictoriousDay(tasks);
  const previous = state.daily[dayKey] || {};
  state.daily[dayKey] = {
    ...previous,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.completed).length,
    victorious,
    victoryRecordedAt: victorious ? previous.victoryRecordedAt || new Date().toISOString() : null
  };
  return state.daily[dayKey];
}

export function shouldShowOuroboros(state, dayKey = todayKey()) {
  const yesterday = addDays(dayKey, -1);
  const beforeYesterday = addDays(dayKey, -2);
  const wins = new Set(getVictoryDays(state));
  const wasOnStreak = wins.has(beforeYesterday);
  const brokeYesterday = state.daily[yesterday] && !state.daily[yesterday].victorious;
  const alreadySeen = state.ui.ouroborosSeenFor.includes(yesterday);
  return Boolean(wasOnStreak && brokeYesterday && !alreadySeen);
}

export function selectQuoteForDay(quotes, history, dayKey = todayKey()) {
  if (history[dayKey]) {
    return quotes.find((quote) => quote.id === history[dayKey]) || quotes[0];
  }

  const recentDayKeys = Array.from({ length: 4 }, (_, index) => addDays(dayKey, -(index + 1)));
  const recentIds = new Set(recentDayKeys.map((key) => history[key]).filter(Boolean));
  const available = quotes.filter((quote) => !recentIds.has(quote.id));
  return (available.length ? available : quotes)[Math.abs(hash(dayKey)) % (available.length || quotes.length)];
}

export function markQuoteForDay(state, dayKey = todayKey()) {
  const quote = selectQuoteForDay(state.quotes, state.quoteHistory, dayKey);
  state.quoteHistory[dayKey] = quote?.id;
  return quote;
}

export function monthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return {
      key: todayKey(date),
      inMonth: date.getMonth() === monthIndex,
      label: date.getDate()
    };
  });
}

export function exportState(state) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    summary: {
      tasks: state.tasks.length,
      notes: state.notes.length,
      workouts: state.workouts.length,
      victoryDays: getVictoryDays(state).length
    },
    data: state
  };
}

export function validateBackup(payload) {
  return Boolean(payload && payload.schemaVersion && payload.data && Array.isArray(payload.data.tasks));
}

function hash(value) {
  return value.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0);
}
