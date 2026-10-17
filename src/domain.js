// Regras de negócio do Magno Space.
// Tudo aqui é puro (sem DOM, sem armazenamento) para ser testado no Node.

import { clamp } from "./util.js";

export const SCHEMA_VERSION = 2;

export const LIMITS = {
  name: 40,
  taskTitle: 200,
  tasksPerDay: 60,
  alertLabel: 60,
  maxAlerts: 12,
  exerciseName: 80,
  workoutNotes: 300,
  noteTitle: 120,
  noteContent: 20000,
  noteTag: 24,
  noteTags: 8,
  waterMaxMl: 20000,
  waterGoalMin: 500,
  waterGoalMax: 10000,
  keepFlags: 60
};

export const DEFAULT_ALERTS = [
  { id: "alert-acucar", label: "Sem açúcar" },
  { id: "alert-ultraprocessados", label: "Sem ultraprocessados" },
  { id: "alert-fastfood", label: "Sem fast food" }
];

// Marcadores da versão 1, convertidos em alertas na migração.
const LEGACY_ALERT_FLAGS = {
  resistedSugar: "alert-acucar",
  resistedUltraProcessed: "alert-ultraprocessados",
  resistedFastFood: "alert-fastfood"
};

/* ------------------------------------------------------------------ datas */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDayKey(value) {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseDayKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dayKey, amount) {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + amount);
  return todayKey(date);
}

// Número inteiro de dias desde 1970, calculado em UTC para não sofrer com horário de verão.
export function dayNumber(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

// Dia local (yyyy-mm-dd) de um carimbo ISO. Evita atribuir à data errada algo feito à noite.
export function localDayOf(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : todayKey(date);
}

export function weekDays(dayKey) {
  const start = addDays(dayKey, -parseDayKey(dayKey).getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthGrid(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthIndex, 1 - firstWeekday + index);
    return { key: todayKey(date), inMonth: date.getMonth() === monthIndex, label: date.getDate() };
  });
}

export function uid(prefix = "id") {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId ? `${prefix}-${cryptoId}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ----------------------------------------------------------------- estado */

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      name: "",
      waterGoalMl: 2500,
      createdAt: new Date().toISOString()
    },
    tasks: [],
    daily: {},
    alerts: DEFAULT_ALERTS.map((alert) => ({ ...alert })),
    workouts: [],
    notes: [],
    ui: {
      ouroborosSeenFor: [],
      celebratedDays: []
    }
  };
}

export function ensureDaily(state, dayKey) {
  state.daily[dayKey] = state.daily[dayKey] || {};
  return state.daily[dayKey];
}

/* ----------------------------------------------------------------- tarefas */

export function tasksForDay(state, dayKey) {
  return state.tasks
    .filter((task) => task.dayKey === dayKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isVictoriousDay(tasks) {
  return tasks.length > 0 && tasks.every((task) => task.completed);
}

export function upsertDailyFromTasks(state, dayKey) {
  const tasks = tasksForDay(state, dayKey);
  const victorious = isVictoriousDay(tasks);
  const daily = ensureDaily(state, dayKey);
  daily.totalTasks = tasks.length;
  daily.completedTasks = tasks.filter((task) => task.completed).length;
  daily.victorious = victorious;
  daily.victoryRecordedAt = victorious ? daily.victoryRecordedAt || new Date().toISOString() : null;
  return daily;
}

// Tarefas de um dia anterior que ficaram em aberto e ainda não existem no dia de destino.
export function carryOverCandidates(state, fromDay, toDay) {
  const existing = new Set(tasksForDay(state, toDay).map((task) => task.title.trim().toLowerCase()));
  return tasksForDay(state, fromDay).filter((task) => !task.completed && !existing.has(task.title.trim().toLowerCase()));
}

/* ------------------------------------------------------------------ streak */

export function getVictoryDays(state) {
  return Object.entries(state.daily)
    .filter(([, day]) => day.victorious)
    .map(([dayKey]) => dayKey);
}

// A sequência continua viva enquanto o dia de hoje ainda está aberto:
// se hoje ainda não foi vencido, contamos a partir de ontem.
export function calculateStreak(victoryDays, referenceDay = todayKey()) {
  const wins = new Set(victoryDays);
  let cursor = wins.has(referenceDay) ? referenceDay : addDays(referenceDay, -1);
  let streak = 0;
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

// Detecta uma sequência quebrada que ainda não foi mostrada ao usuário.
// Cobre também o caso de ficar vários dias sem abrir o app.
export function ouroborosBreak(state, dayKey = todayKey()) {
  const wins = new Set(getVictoryDays(state));
  if (wins.has(dayKey) || wins.has(addDays(dayKey, -1))) return null;

  let lastWin = null;
  for (const day of wins) {
    if (day < dayKey && (lastWin === null || day > lastWin)) lastWin = day;
  }
  if (!lastWin) return null;

  const brokenOn = addDays(lastWin, 1);
  if (state.ui.ouroborosSeenFor.includes(brokenOn)) return null;
  return { brokenOn, lostStreak: calculateStreak([...wins], lastWin) };
}

export function shouldShowOuroboros(state, dayKey = todayKey()) {
  return Boolean(ouroborosBreak(state, dayKey));
}

export function rememberFlag(list, value) {
  return [...new Set([...list, value])].slice(-LIMITS.keepFlags);
}

/* ------------------------------------------------------------------ frases */

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Passo coprimo com o tamanho da lista: a frase muda todo dia, parece sorteada,
// e a biblioteca inteira é percorrida antes de qualquer repetição.
function coprimeStep(size) {
  if (size <= 2) return 1;
  let step = Math.max(1, Math.round(size * 0.6180339887));
  while (gcd(step, size) !== 1) step += 1;
  return step;
}

export function quoteForDay(quotes, dayKey = todayKey()) {
  if (!quotes.length) return null;
  const size = quotes.length;
  const index = ((dayNumber(dayKey) % size) * coprimeStep(size)) % size;
  return quotes[index];
}

/* --------------------------------------------------------- resumo e agenda */

export function indexState(state) {
  const tasksByDay = new Map();
  for (const task of state.tasks) {
    const list = tasksByDay.get(task.dayKey) || [];
    list.push(task);
    tasksByDay.set(task.dayKey, list);
  }

  const workoutsByDay = new Map();
  for (const workout of state.workouts) {
    workoutsByDay.set(workout.dayKey, (workoutsByDay.get(workout.dayKey) || 0) + 1);
  }

  const notesByDay = new Map();
  for (const note of state.notes) {
    const days = new Set([localDayOf(note.createdAt), localDayOf(note.updatedAt)].filter(Boolean));
    for (const day of days) notesByDay.set(day, (notesByDay.get(day) || 0) + 1);
  }

  return { tasksByDay, workoutsByDay, notesByDay };
}

export function summarizeDay(state, dayKey, index = indexState(state)) {
  const tasks = index.tasksByDay.get(dayKey) || [];
  const daily = state.daily[dayKey] || {};
  const alertsDone = state.alerts.filter((alert) => daily.alertsDone?.[alert.id]).length;
  return {
    dayKey,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.completed).length,
    victorious: isVictoriousDay(tasks),
    waterMl: daily.waterMl || 0,
    alertsDone,
    alertsTotal: state.alerts.length,
    workouts: index.workoutsByDay.get(dayKey) || 0,
    notes: index.notesByDay.get(dayKey) || 0
  };
}

export function dayStatus(summary, dayKey, today = todayKey()) {
  if (summary.victorious) return "victory";
  if (summary.totalTasks === 0) return "empty";
  if (dayKey > today) return "pending";
  if (summary.completedTasks > 0) return "partial";
  return dayKey === today ? "pending" : "missed";
}

export function monthStats(state, year, monthIndex, today = todayKey(), index = indexState(state)) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let victories = 0;
  let trackedDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = todayKey(new Date(year, monthIndex, day));
    if (key > today) break;
    const summary = summarizeDay(state, key, index);
    if (summary.victorious) victories += 1;
    if (summary.totalTasks > 0) trackedDays += 1;
  }

  return { victories, trackedDays, rate: trackedDays ? Math.round((victories / trackedDays) * 100) : 0 };
}

/* ------------------------------------------------------------------- água */

export function addWater(state, dayKey, amountMl) {
  const daily = ensureDaily(state, dayKey);
  daily.waterMl = clamp((daily.waterMl || 0) + amountMl, 0, LIMITS.waterMaxMl);
  return daily.waterMl;
}

// Meta distribuída entre 7h e 22h: mostra se o consumo está no ritmo para bater a meta.
export function waterPace(waterMl, goalMl, now = new Date()) {
  if (waterMl >= goalMl) return { status: "done", expected: goalMl, deficit: 0 };
  const hour = now.getHours() + now.getMinutes() / 60;
  const progress = clamp((hour - 7) / 15, 0, 1);
  const expected = Math.round((goalMl * progress) / 50) * 50;
  const deficit = Math.max(0, expected - waterMl);
  return { status: deficit >= 250 ? "behind" : "ontrack", expected, deficit };
}

export function waterWeek(state, dayKey, goalMl) {
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(dayKey, index - 6);
    const ml = state.daily[key]?.waterMl || 0;
    return { dayKey: key, ml, percent: clamp(Math.round((ml / goalMl) * 100), 0, 100) };
  });
}

/* ---------------------------------------------------------------- alertas */

export function addAlert(state, label) {
  const clean = String(label ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.alertLabel);
  if (!clean) return { ok: false, reason: "vazio" };
  if (state.alerts.length >= LIMITS.maxAlerts) return { ok: false, reason: "limite" };
  if (state.alerts.some((alert) => alert.label.toLowerCase() === clean.toLowerCase())) {
    return { ok: false, reason: "duplicado" };
  }
  const alert = { id: uid("alert"), label: clean };
  state.alerts.push(alert);
  return { ok: true, alert };
}

export function removeAlert(state, alertId) {
  const index = state.alerts.findIndex((alert) => alert.id === alertId);
  if (index === -1) return null;
  const [removed] = state.alerts.splice(index, 1);
  for (const daily of Object.values(state.daily)) {
    if (daily.alertsDone) delete daily.alertsDone[alertId];
  }
  return { alert: removed, index };
}

export function toggleAlert(state, dayKey, alertId) {
  if (!state.alerts.some((alert) => alert.id === alertId)) return false;
  const daily = ensureDaily(state, dayKey);
  daily.alertsDone = daily.alertsDone || {};
  if (daily.alertsDone[alertId]) delete daily.alertsDone[alertId];
  else daily.alertsDone[alertId] = true;
  return Boolean(daily.alertsDone[alertId]);
}

/* ----------------------------------------------------------------- treinos */

export function exerciseKey(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Primeiro número encontrado: "40", "42,5 kg", "20kg cada". Sem número (peso corporal) vira null.
export function parseLoad(value) {
  const match = String(value ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function formatKg(value) {
  return `${String(Math.round(value * 100) / 100).replace(".", ",")} kg`;
}

function chronological(a, b) {
  return a.dayKey.localeCompare(b.dayKey) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

// Compara um registro com tudo o que veio antes do mesmo exercício.
export function workoutInsight(workouts, workout) {
  const key = exerciseKey(workout.name);
  const load = parseLoad(workout.load);
  const earlier = workouts
    .filter((item) => exerciseKey(item.name) === key && chronological(item, workout) < 0 && parseLoad(item.load) !== null)
    .sort(chronological);

  if (load === null || !earlier.length) return { load, previousLoad: null, delta: null, isRecord: false };

  const previousLoad = parseLoad(earlier[earlier.length - 1].load);
  const bestBefore = Math.max(...earlier.map((item) => parseLoad(item.load)));
  return { load, previousLoad, delta: load - previousLoad, isRecord: load > bestBefore };
}

export function exerciseStats(workouts) {
  const groups = new Map();
  for (const workout of [...workouts].sort(chronological)) {
    const key = exerciseKey(workout.name);
    if (!key) continue;
    const group = groups.get(key) || { key, name: workout.name, entries: [] };
    group.name = workout.name;
    group.entries.push(workout);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      const perDay = new Map();
      for (const entry of group.entries) {
        const load = parseLoad(entry.load);
        if (load !== null) perDay.set(entry.dayKey, Math.max(perDay.get(entry.dayKey) ?? 0, load));
      }
      const points = [...perDay.values()];
      return {
        key: group.key,
        name: group.name,
        sessions: new Set(group.entries.map((entry) => entry.dayKey)).size,
        lastDay: group.entries[group.entries.length - 1].dayKey,
        points,
        best: points.length ? Math.max(...points) : null,
        last: points.length ? points[points.length - 1] : null,
        delta: points.length > 1 ? points[points.length - 1] - points[0] : null
      };
    })
    .sort((a, b) => b.lastDay.localeCompare(a.lastDay) || a.name.localeCompare(b.name));
}

export function lastSessionBefore(workouts, dayKey) {
  const days = [...new Set(workouts.filter((item) => item.dayKey < dayKey).map((item) => item.dayKey))].sort();
  return days.length ? days[days.length - 1] : null;
}

/* ------------------------------------------------------------------- notas */

// "estudo, #foco ,estudo" vira ["estudo", "foco"]: sem espaços, sem "#", sem repetição.
export function parseTags(value) {
  const tags = String(value ?? "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, "").trim().slice(0, LIMITS.noteTag))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, LIMITS.noteTags);
}

/* ------------------------------------------------- backup e normalização */

function text(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isoOrNow(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString();
}

function sanitizeList(value, mapper) {
  return (Array.isArray(value) ? value : []).map(mapper).filter(Boolean);
}

function sanitizeAlerts(raw, legacy) {
  if (!Array.isArray(raw)) return legacy ? DEFAULT_ALERTS.map((alert) => ({ ...alert })) : [];
  const seen = new Set();
  return raw
    .map((item) => {
      const label = text(item?.label, LIMITS.alertLabel).replace(/\s+/g, " ").trim();
      const id = text(item?.id, 80) || uid("alert");
      if (!label || seen.has(id)) return null;
      seen.add(id);
      return { id, label };
    })
    .filter(Boolean)
    .slice(0, LIMITS.maxAlerts);
}

// Recebe qualquer coisa (dados antigos, backup importado, lixo) e devolve um estado válido.
// Nada do que vem de fora entra sem passar por aqui.
export function normalizeState(raw) {
  const base = createInitialState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const legacy = !Array.isArray(raw.alerts);
  const state = createInitialState();

  state.settings = {
    name: text(raw.settings?.name, LIMITS.name).trim(),
    waterGoalMl: clamp(Math.round(finiteNumber(raw.settings?.waterGoalMl, 2500)), LIMITS.waterGoalMin, LIMITS.waterGoalMax),
    createdAt: isoOrNow(raw.settings?.createdAt)
  };

  state.alerts = sanitizeAlerts(raw.alerts, legacy);

  state.tasks = sanitizeList(raw.tasks, (task) => {
    const title = text(task?.title, LIMITS.taskTitle).trim();
    if (!title || !isDayKey(task?.dayKey)) return null;
    const completed = task.completed === true;
    return {
      id: text(task.id, 80) || uid("task"),
      title,
      dayKey: task.dayKey,
      completed,
      createdAt: isoOrNow(task.createdAt),
      completedAt: completed ? isoOrNow(task.completedAt) : null
    };
  });

  const alertIds = new Set(state.alerts.map((alert) => alert.id));
  const daily = raw.daily && typeof raw.daily === "object" && !Array.isArray(raw.daily) ? raw.daily : {};
  for (const [dayKey, entry] of Object.entries(daily)) {
    if (!isDayKey(dayKey) || !entry || typeof entry !== "object") continue;
    const alertsDone = {};
    for (const id of Object.keys(entry.alertsDone && typeof entry.alertsDone === "object" ? entry.alertsDone : {})) {
      if (alertIds.has(id) && entry.alertsDone[id] === true) alertsDone[id] = true;
    }
    for (const [flag, id] of Object.entries(LEGACY_ALERT_FLAGS)) {
      if (entry[flag] === true && alertIds.has(id)) alertsDone[id] = true;
    }
    state.daily[dayKey] = {
      waterMl: clamp(Math.round(finiteNumber(entry.waterMl)), 0, LIMITS.waterMaxMl),
      alertsDone
    };
  }

  // A vitória do dia é sempre derivada das tarefas; nunca confiamos no valor salvo.
  const days = new Set(state.tasks.map((task) => task.dayKey));
  for (const dayKey of days) {
    const previous = daily[dayKey];
    upsertDailyFromTasks(state, dayKey);
    if (state.daily[dayKey].victorious && typeof previous?.victoryRecordedAt === "string") {
      state.daily[dayKey].victoryRecordedAt = isoOrNow(previous.victoryRecordedAt);
    }
  }

  state.workouts = sanitizeList(raw.workouts, (workout) => {
    const name = text(workout?.name, LIMITS.exerciseName).trim();
    if (!name || !isDayKey(workout?.dayKey)) return null;
    return {
      id: text(workout.id, 80) || uid("workout"),
      dayKey: workout.dayKey,
      name,
      sets: String(workout.sets ?? "").slice(0, 4),
      reps: String(workout.reps ?? "").slice(0, 20),
      load: String(workout.load ?? "").slice(0, 20),
      notes: text(workout.notes, LIMITS.workoutNotes),
      createdAt: isoOrNow(workout.createdAt)
    };
  });

  state.notes = sanitizeList(raw.notes, (note) => {
    const title = text(note?.title, LIMITS.noteTitle).trim();
    if (!title) return null;
    const tags = sanitizeList(note.tags, (tag) => text(tag, LIMITS.noteTag).trim() || null).slice(0, LIMITS.noteTags);
    const createdAt = isoOrNow(note.createdAt);
    return {
      id: text(note.id, 80) || uid("note"),
      title,
      content: text(note.content, LIMITS.noteContent).replace(/\r\n?/g, "\n"),
      tags: [...new Set(tags)],
      pinned: note.pinned === true,
      createdAt,
      updatedAt: isoOrNow(note.updatedAt || createdAt)
    };
  });

  const flags = (value) => sanitizeList(value, (day) => (isDayKey(day) ? day : null)).slice(-LIMITS.keepFlags);
  state.ui = {
    ouroborosSeenFor: flags(raw.ui?.ouroborosSeenFor),
    celebratedDays: flags(raw.ui?.celebratedDays)
  };

  return state;
}

export function exportState(state) {
  return {
    app: "magno-space",
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

// Devolve o motivo do problema, ou null se o arquivo parece um backup utilizável.
export function backupProblem(payload) {
  if (!payload || typeof payload !== "object") return "O arquivo não é um backup do Magno Space.";
  if (typeof payload.schemaVersion !== "number" || !payload.data || typeof payload.data !== "object") {
    return "O arquivo não é um backup do Magno Space.";
  }
  if (payload.schemaVersion > SCHEMA_VERSION) return "Este backup vem de uma versão mais nova do app. Atualize o Magno Space antes de importar.";
  if (!Array.isArray(payload.data.tasks)) return "O backup está incompleto: faltam as tarefas.";
  return null;
}

export function validateBackup(payload) {
  return backupProblem(payload) === null;
}
