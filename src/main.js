import {
  LIMITS,
  addAlert,
  addDays,
  addWater,
  backupProblem,
  bestStreak,
  calculateStreak,
  carryOverCandidates,
  createInitialState,
  dayStatus,
  exerciseKey,
  exerciseStats,
  exportState,
  getVictoryDays,
  indexState,
  isVictoriousDay,
  lastSessionBefore,
  monthGrid,
  monthStats,
  normalizeState,
  ouroborosBreak,
  parseDayKey,
  parseTags,
  quoteForDay,
  rememberFlag,
  removeAlert,
  summarizeDay,
  tasksForDay,
  todayKey,
  toggleAlert,
  uid,
  upsertDailyFromTasks,
  waterPace,
  waterWeek,
  weekDays,
  workoutInsight,
  formatKg
} from "./domain.js";
import { APP_VERSION, OUROBOROS_TEXT, coachMessage, greeting, victoryMessage } from "./content.js";
import { quotes } from "./quotes.js";
import { renderRich, toggleCheckLine } from "./richtext.js";
import { ouroborosSvg } from "./ouroboros.js";
import { loadState, saveState, wipeState } from "./store.js";
import { clamp, escapeHtml as esc, plural } from "./util.js";

/* ------------------------------------------------------------ elementos */

const appEl = document.querySelector("#app");
const pager = document.querySelector("#pager");
const tabsEl = document.querySelector(".tabs");
const tabEls = [...tabsEl.querySelectorAll(".tab")];
const indicator = tabsEl.querySelector(".tab-indicator");
const pageEls = [...pager.querySelectorAll(".page")];
const overlayRoot = document.querySelector("#overlay-root");
const toastEl = document.querySelector("#toast");
const PAGE_IDS = pageEls.map((page) => page.dataset.page);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------- estado */

let state = await loadState();
let currentDay = todayKey();
let planDay = currentDay;
let workoutDay = currentDay;
let calendarDay = currentDay;
let calendarMonth = monthOf(currentDay);
let alertsEditing = false;
let notesUi = { query: "", tag: "", composing: false, editingId: null };
let activeIndex = 0;
let lastRenderedHour = new Date().getHours();
let saveWarned = false;
let toastTimer = null;
let overlayReturnFocus = null;

const RENDERERS = {
  today: todayPage,
  workouts: workoutsPage,
  notes: notesPage,
  calendar: calendarPage,
  settings: settingsPage
};

/* ------------------------------------------------------------- utilidades */

function monthOf(dayKey) {
  const date = parseDayKey(dayKey);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function formatDay(dayKey, options = { day: "numeric", month: "long" }) {
  return parseDayKey(dayKey).toLocaleDateString("pt-BR", options);
}

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

function weekdayLetter(dayKey) {
  return WEEKDAY_LETTERS[parseDayKey(dayKey).getDay()];
}

const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* -------------------------------------------------------------- renderizar */

function renderPage(id) {
  const el = document.querySelector(`#page-${id}`);
  const typed = captureFields(el);
  const focusTarget = captureFocus(el);
  const scrollTop = el.scrollTop;

  el.innerHTML = RENDERERS[id]();

  restoreFields(el, typed);
  applyDynamicStyles(el);
  el.scrollTop = scrollTop;
  restoreFocus(el, focusTarget);
}

function refresh(...ids) {
  (ids.length ? ids : PAGE_IDS).forEach(renderPage);
}

// Larguras e alturas dinâmicas passam pelo CSSOM, porque a política de segurança
// (CSP) do app proíbe o atributo style="..." escrito no HTML.
function applyDynamicStyles(root) {
  root.querySelectorAll("[data-w]").forEach((node) => {
    node.style.width = `${node.dataset.w}%`;
  });
  root.querySelectorAll("[data-h]").forEach((node) => {
    node.style.height = `${node.dataset.h}%`;
  });
}

// Se a tela é redesenhada enquanto o usuário digita, o texto digitado não se perde.
function captureFields(root) {
  const values = new Map();
  root.querySelectorAll("form[data-form] input[name], form[data-form] textarea[name]").forEach((field) => {
    if (field.type === "file" || field.value === field.defaultValue) return;
    values.set(fieldKey(field), field.value);
  });
  return values;
}

function restoreFields(root, values) {
  if (!values.size) return;
  root.querySelectorAll("form[data-form] input[name], form[data-form] textarea[name]").forEach((field) => {
    const saved = values.get(fieldKey(field));
    if (saved !== undefined) field.value = saved;
  });
}

function fieldKey(field) {
  const form = field.closest("form");
  return `${form.dataset.form}|${form.dataset.id || ""}|${field.name}`;
}

function captureFocus(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return null;
  if (active.name) return { type: "field", key: fieldKey(active) };
  if (active.dataset.action) return { type: "action", action: active.dataset.action, id: active.dataset.id, extra: active.dataset.day || active.dataset.key || active.dataset.tag };
  return null;
}

function restoreFocus(root, target) {
  if (!target) return;
  let node = null;
  if (target.type === "field") {
    node = [...root.querySelectorAll("form[data-form] [name]")].find((field) => fieldKey(field) === target.key);
  } else {
    node = [...root.querySelectorAll("[data-action]")].find(
      (candidate) =>
        candidate.dataset.action === target.action &&
        candidate.dataset.id === target.id &&
        (candidate.dataset.day || candidate.dataset.key || candidate.dataset.tag) === target.extra
    );
  }
  node?.focus({ preventScroll: true });
}

/* ================================================================== HOJE */

function todayPage() {
  const now = new Date();
  const quote = quoteForDay(quotes, currentDay);
  const victoryDays = getVictoryDays(state);
  const streak = calculateStreak(victoryDays, currentDay);
  const best = bestStreak(victoryDays);
  const summary = summarizeDay(state, currentDay);
  const goal = state.settings.waterGoalMl;
  const waterPercent = clamp(Math.round((summary.waterMl / goal) * 100), 0, 100);

  const streakNote = best === 0 ? "comece hoje" : streak === best ? "seu recorde" : `recorde ${best}`;
  const date = cap(formatDay(currentDay, { weekday: "long", day: "numeric", month: "long" }));

  return `
    <header class="page-head">
      <p class="greet">${esc(greeting(now.getHours(), state.settings.name))}</p>
      <p class="date">${esc(date)}</p>
    </header>

    <article class="card mind" aria-labelledby="mind-title">
      <p class="eyebrow" id="mind-title">Reprograme sua Mente</p>
      <blockquote><p>${esc(quote?.text ?? "Aja hoje.")}</p></blockquote>
      <footer>
        <span class="author">${esc(quote?.author ?? "Magno Space")}</span>
        ${quote?.note ? `<span class="note">${esc(quote.note)}</span>` : ""}
      </footer>
    </article>

    <section class="stats" aria-label="Resumo do dia">
      <div class="stat stat-streak">
        <span class="stat-label">Streak</span>
        <strong>${streak}</strong>
        <small>${streak === 1 ? "dia" : "dias"} · ${esc(streakNote)}</small>
      </div>
      <div class="stat">
        <span class="stat-label">Hoje</span>
        <strong>${summary.completedTasks}<i>/${summary.totalTasks}</i></strong>
        <small>${summary.totalTasks === 1 ? "tarefa" : "tarefas"}</small>
      </div>
      <div class="stat">
        <span class="stat-label">Água</span>
        <strong>${waterPercent}<i>%</i></strong>
        <small>da meta</small>
      </div>
    </section>

    ${checklistCard(streak)}
    ${waterCard(summary, goal, waterPercent, now)}
  `;
}

function checklistCard(streak) {
  const isToday = planDay === currentDay;
  const tasks = tasksForDay(state, planDay);
  const done = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const won = isVictoriousDay(tasks);
  const tomorrow = addDays(currentDay, 1);
  const carry = isToday ? carryOverCandidates(state, addDays(currentDay, -1), currentDay) : [];

  const coach = isToday
    ? coachMessage({ hour: new Date().getHours(), total: tasks.length, done, streak, dayKey: currentDay })
    : null;

  return `
    <article class="card checklist${won && isToday ? " is-won" : ""}" aria-labelledby="checklist-title">
      <div class="card-head">
        <div>
          <p class="eyebrow">Checklist</p>
          <h2 id="checklist-title">Vá e vença</h2>
        </div>
        <div class="segmented" role="group" aria-label="Dia do checklist">
          <button type="button" aria-pressed="${isToday}" data-action="plan-day" data-day="today">Hoje</button>
          <button type="button" aria-pressed="${!isToday}" data-action="plan-day" data-day="tomorrow">Amanhã</button>
        </div>
      </div>

      ${
        isToday
          ? `<p class="coach coach-${coach.tone}">${esc(coach.text)}</p>`
          : `<p class="coach">Planeje agora o que vai decidir o seu dia de amanhã, ${esc(formatDay(tomorrow))}.</p>`
      }

      <div class="progress-line">
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Progresso das tarefas">
          <span data-w="${percent}"></span>
        </div>
        <small>${done}/${tasks.length}</small>
      </div>

      ${
        tasks.length
          ? `<ul class="task-list">${tasks.map(taskItem).join("")}</ul>`
          : `<p class="empty">${isToday ? "Nenhuma tarefa para hoje. Escreva a primeira abaixo." : "Nada planejado para amanhã ainda."}</p>`
      }

      <form class="inline-form" data-form="add-task" autocomplete="off">
        <input name="title" maxlength="${LIMITS.taskTitle}" placeholder="${isToday ? "Nova tarefa decisiva" : "Planejar tarefa de amanhã"}" aria-label="Nova tarefa" required />
        <button type="submit" class="btn btn-primary">Adicionar</button>
      </form>

      ${
        carry.length
          ? `<button type="button" class="btn btn-quiet" data-action="carry-over">Trazer ${esc(plural(carry.length, "pendência", "pendências"))} de ontem</button>`
          : ""
      }

      ${isToday ? alertsBlock() : ""}
    </article>
  `;
}

function taskItem(task) {
  return `
    <li class="task${task.completed ? " done" : ""}">
      <button type="button" class="check" role="checkbox" aria-checked="${task.completed}"
        aria-label="${task.completed ? "Desmarcar" : "Concluir"}: ${esc(task.title)}"
        data-action="toggle-task" data-id="${esc(task.id)}">${CHECK_ICON}</button>
      <span class="task-title">${esc(task.title)}</span>
      <button type="button" class="icon-btn ghost" aria-label="Excluir tarefa: ${esc(task.title)}"
        data-action="delete-task" data-id="${esc(task.id)}">×</button>
    </li>`;
}

function alertsBlock() {
  const done = state.daily[currentDay]?.alertsDone || {};
  const doneCount = state.alerts.filter((alert) => done[alert.id]).length;

  const body = alertsEditing
    ? `
      <ul class="alert-editor">
        ${state.alerts
          .map(
            (alert) => `
          <li><span>${esc(alert.label)}</span>
            <button type="button" class="icon-btn ghost" aria-label="Remover alerta: ${esc(alert.label)}" data-action="remove-alert" data-id="${esc(alert.id)}">×</button>
          </li>`
          )
          .join("")}
      </ul>
      ${state.alerts.length ? "" : `<p class="empty">Nenhum alerta. Crie o primeiro abaixo.</p>`}
      ${
        state.alerts.length < LIMITS.maxAlerts
          ? `<form class="inline-form" data-form="add-alert" autocomplete="off">
              <input name="label" maxlength="${LIMITS.alertLabel}" placeholder="Ex.: Dormir antes das 23h" aria-label="Novo alerta" required />
              <button type="submit" class="btn">Criar</button>
            </form>`
          : `<p class="hint">Limite de ${LIMITS.maxAlerts} alertas atingido.</p>`
      }`
    : state.alerts.length
      ? `<div class="chips">
          ${state.alerts
            .map(
              (alert) => `
            <button type="button" class="chip${done[alert.id] ? " on" : ""}" aria-pressed="${Boolean(done[alert.id])}" data-action="toggle-alert" data-id="${esc(alert.id)}">
              ${esc(alert.label)}
            </button>`
            )
            .join("")}
        </div>`
      : `<p class="empty">Você não tem alertas. Toque em Editar para criar.</p>`;

  return `
    <div class="alerts">
      <div class="alerts-head">
        <div>
          <h3>Alertas do dia</h3>
          <small>${alertsEditing ? "Crie ou remova os seus lembretes." : state.alerts.length ? `${doneCount} de ${state.alerts.length} mantidos hoje` : "Lembretes para seguir o checklist."}</small>
        </div>
        <button type="button" class="btn btn-quiet btn-small" data-action="toggle-alerts-edit">${alertsEditing ? "Concluir" : "Editar"}</button>
      </div>
      ${body}
    </div>`;
}

function waterCard(summary, goal, percent, now) {
  const pace = waterPace(summary.waterMl, goal, now);
  const week = waterWeek(state, currentDay, goal);
  const paceText =
    pace.status === "done"
      ? "Meta batida. Hidratação em dia."
      : pace.status === "behind"
        ? `Você está ${pace.deficit} ml abaixo do ritmo para esta hora. Beba agora.`
        : "No ritmo da meta. Continue assim.";

  return `
    <article class="card" aria-labelledby="water-title">
      <p class="eyebrow">Hidratação</p>
      <h2 id="water-title">${summary.waterMl} ml <span class="of">de ${goal} ml</span></h2>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Meta de água">
        <span data-w="${percent}"></span>
      </div>
      <p class="pace pace-${pace.status}">${esc(paceText)}</p>
      <div class="btn-row three">
        <button type="button" class="btn" data-action="add-water" data-amount="250">+250 ml</button>
        <button type="button" class="btn" data-action="add-water" data-amount="500">+500 ml</button>
        <button type="button" class="btn btn-quiet" data-action="add-water" data-amount="-250">−250 ml</button>
      </div>
      <div class="week-bars" role="img" aria-label="Água nos últimos 7 dias">
        ${week
          .map(
            (day) => `
          <div class="wb${day.dayKey === currentDay ? " today" : ""}" title="${esc(formatDay(day.dayKey))}: ${day.ml} ml">
            <div class="wb-track"><span data-h="${day.percent}"></span></div>
            <em>${weekdayLetter(day.dayKey)}</em>
          </div>`
          )
          .join("")}
      </div>
    </article>`;
}

/* ============================================================== TREINOS */

function workoutsPage() {
  const days = weekDays(workoutDay);
  const withWorkouts = new Set(state.workouts.map((workout) => workout.dayKey));
  const todays = state.workouts
    .filter((workout) => workout.dayKey === workoutDay)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const previousSession = lastSessionBefore(state.workouts, workoutDay);
  const exerciseNames = [...new Map(state.workouts.map((workout) => [exerciseKey(workout.name), workout.name])).values()].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const stats = exerciseStats(state.workouts).filter((item) => item.best !== null);

  return `
    <article class="card" aria-labelledby="week-title">
      <div class="card-head">
        <div>
          <p class="eyebrow">Musculação</p>
          <h2 id="week-title">${esc(cap(formatDay(days[0], { day: "numeric", month: "short" })))} a ${esc(formatDay(days[6], { day: "numeric", month: "short" }))}</h2>
        </div>
        <div class="btn-row pair">
          <button type="button" class="icon-btn" aria-label="Semana anterior" data-action="workout-week" data-step="-1">‹</button>
          <button type="button" class="icon-btn" aria-label="Próxima semana" data-action="workout-week" data-step="1">›</button>
        </div>
      </div>
      <div class="week-strip">
        ${days
          .map(
            (day) => `
          <button type="button" class="wday${day === workoutDay ? " selected" : ""}${day === currentDay ? " today" : ""}" aria-pressed="${day === workoutDay}"
            aria-label="${esc(formatDay(day, { weekday: "long", day: "numeric", month: "long" }))}${withWorkouts.has(day) ? ", com treino" : ""}"
            data-action="workout-day" data-day="${day}">
            <span>${weekdayLetter(day)}</span>
            <strong>${parseDayKey(day).getDate()}</strong>
            <i class="${withWorkouts.has(day) ? "dot" : "dot off"}"></i>
          </button>`
          )
          .join("")}
      </div>
    </article>

    <article class="card" aria-labelledby="workout-title">
      <div class="card-head">
        <div>
          <p class="eyebrow">Treino de ${esc(formatDay(workoutDay))}</p>
          <h2 id="workout-title">Registrar exercício</h2>
        </div>
        ${
          !todays.length && previousSession
            ? `<button type="button" class="btn btn-quiet btn-small" data-action="repeat-workout">Repetir treino de ${esc(formatDay(previousSession, { day: "numeric", month: "short" }))}</button>`
            : ""
        }
      </div>
      <form class="form" data-form="add-workout" autocomplete="off">
        <label>Exercício
          <input name="name" list="exercise-list" data-field="exercise-name" maxlength="${LIMITS.exerciseName}" placeholder="Supino reto" required />
        </label>
        <datalist id="exercise-list">${exerciseNames.map((name) => `<option value="${esc(name)}"></option>`).join("")}</datalist>
        <p class="hint" id="exercise-hint" aria-live="polite"></p>
        <div class="row3">
          <label>Séries <input name="sets" inputmode="numeric" maxlength="3" value="3" /></label>
          <label>Repetições <input name="reps" maxlength="12" value="10" /></label>
          <label>Carga (kg) <input name="load" inputmode="decimal" maxlength="10" placeholder="40" /></label>
        </div>
        <label>Observações
          <input name="notes" maxlength="${LIMITS.workoutNotes}" placeholder="Técnica, sensação, progresso" />
        </label>
        <button type="submit" class="btn btn-primary">Registrar exercício</button>
      </form>
    </article>

    <section class="stack" aria-label="Exercícios do dia">
      ${todays.length ? todays.map(workoutCard).join("") : `<p class="empty card">Nenhum exercício registrado em ${esc(formatDay(workoutDay))}.</p>`}
    </section>

    ${
      stats.length
        ? `<article class="card" aria-labelledby="evolution-title">
            <p class="eyebrow">Progressão</p>
            <h2 id="evolution-title">Evolução das cargas</h2>
            <ul class="evolution">${stats.slice(0, 12).map(evolutionRow).join("")}</ul>
          </article>`
        : ""
    }
  `;
}

function formatLoad(load) {
  if (!load) return "sem carga";
  return /^[\d.,]+$/.test(load) ? `${load} kg` : load;
}

function workoutCard(workout) {
  const insight = workoutInsight(state.workouts, workout);
  let trend = "";
  if (insight.delta !== null) {
    if (insight.delta > 0) trend = `<span class="trend up">▲ ${esc(formatKg(insight.delta))} sobre o último treino</span>`;
    else if (insight.delta < 0) trend = `<span class="trend down">▼ ${esc(formatKg(Math.abs(insight.delta)))} abaixo do último treino</span>`;
    else trend = `<span class="trend">Mesma carga do último treino</span>`;
  }

  return `
    <article class="card compact">
      <div class="card-head">
        <div>
          <h3>${esc(workout.name)}${insight.isRecord ? ` <span class="badge">Recorde</span>` : ""}</h3>
          <p class="meta">${esc(workout.sets)} × ${esc(workout.reps)} · ${esc(formatLoad(workout.load))}</p>
        </div>
        <button type="button" class="icon-btn ghost" aria-label="Excluir exercício: ${esc(workout.name)}" data-action="delete-workout" data-id="${esc(workout.id)}">×</button>
      </div>
      ${trend ? `<p class="meta">${trend}</p>` : ""}
      ${workout.notes ? `<p class="note-text">${esc(workout.notes)}</p>` : ""}
    </article>`;
}

function evolutionRow(item) {
  const delta =
    item.delta === null
      ? ""
      : item.delta > 0
        ? `<span class="trend up">▲ ${esc(formatKg(item.delta))}</span>`
        : item.delta < 0
          ? `<span class="trend down">▼ ${esc(formatKg(Math.abs(item.delta)))}</span>`
          : `<span class="trend">estável</span>`;
  return `
    <li>
      <div>
        <strong>${esc(item.name)}</strong>
        <small>${esc(plural(item.sessions, "treino", "treinos"))} · melhor ${esc(formatKg(item.best))} ${delta}</small>
      </div>
      ${sparkline(item.points)}
    </li>`;
}

function sparkline(points) {
  const data = points.slice(-12);
  if (data.length < 2) return `<span class="spark-empty" aria-hidden="true">${esc(formatKg(data[0]))}</span>`;
  const width = 88;
  const height = 30;
  const pad = 4;
  const min = Math.min(...data);
  const span = Math.max(...data) - min || 1;
  const coords = data.map((value, index) => [
    pad + (index * (width - pad * 2)) / (data.length - 1),
    height - pad - ((value - min) / span) * (height - pad * 2)
  ]);
  const last = coords[coords.length - 1];
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
    <polyline points="${coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6"/>
  </svg>`;
}

/* =============================================================== NOTAS */

function notesPage() {
  const tags = [...new Set(state.notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return `
    <article class="card" aria-labelledby="notes-title">
      <div class="card-head">
        <div>
          <p class="eyebrow">Bloco de notas</p>
          <h2 id="notes-title">Reflexões e aprendizados</h2>
        </div>
        <button type="button" class="btn ${notesUi.composing ? "btn-quiet" : "btn-primary"} btn-small" data-action="notes-compose">${notesUi.composing ? "Fechar" : "Nova nota"}</button>
      </div>
      ${notesUi.composing ? noteForm() : ""}
      <input type="search" class="search" data-field="note-search" value="${esc(notesUi.query)}" placeholder="Buscar nas notas" aria-label="Buscar nas notas" autocomplete="off" />
      ${
        tags.length
          ? `<div class="chips tags">${tags
              .map(
                (tag) =>
                  `<button type="button" class="chip${notesUi.tag === tag ? " on" : ""}" aria-pressed="${notesUi.tag === tag}" data-action="filter-tag" data-tag="${esc(tag)}">#${esc(tag)}</button>`
              )
              .join("")}</div>`
          : ""
      }
    </article>
    <section class="stack" id="notes-list" aria-label="Notas">${notesList()}</section>
  `;
}

function noteForm(note = null) {
  return `
    <form class="form note-form" data-form="${note ? "edit-note" : "add-note"}" ${note ? `data-id="${esc(note.id)}"` : ""} autocomplete="off">
      <label>Título <input name="title" maxlength="${LIMITS.noteTitle}" value="${esc(note?.title ?? "")}" placeholder="Ideia, leitura ou reflexão" required /></label>
      <label>Conteúdo
        <textarea name="content" rows="7" maxlength="${LIMITS.noteContent}" placeholder="Escreva sem perder o fluxo…">${esc(note?.content ?? "")}</textarea>
      </label>
      <p class="hint">Formatação: <code># título</code> · <code>- lista</code> · <code>[ ] tarefa</code> · <code>**negrito**</code></p>
      <label>Tags <input name="tags" maxlength="120" value="${esc(note?.tags.join(", ") ?? "")}" placeholder="leitura, estratégia" /></label>
      <div class="btn-row pair">
        <button type="submit" class="btn btn-primary">${note ? "Salvar alterações" : "Salvar nota"}</button>
        <button type="button" class="btn btn-quiet" data-action="notes-cancel">Cancelar</button>
      </div>
    </form>`;
}

function visibleNotes() {
  const query = exerciseKey(notesUi.query);
  return state.notes
    .filter((note) => !notesUi.tag || note.tags.includes(notesUi.tag))
    .filter((note) => !query || exerciseKey(`${note.title} ${note.content} ${note.tags.join(" ")}`).includes(query))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

function notesList() {
  const notes = visibleNotes();
  if (!notes.length) {
    const filtering = notesUi.query || notesUi.tag;
    return `<p class="empty card">${filtering ? "Nenhuma nota encontrada para essa busca." : "Seu bloco de notas está limpo. Toque em Nova nota."}</p>`;
  }
  return notes.map(noteCard).join("");
}

function noteCard(note) {
  if (notesUi.editingId === note.id) return `<article class="card note">${noteForm(note)}</article>`;
  const updated = note.updatedAt.slice(0, 10);
  return `
    <article class="card note${note.pinned ? " pinned" : ""}">
      <div class="card-head">
        <div>
          <h3>${note.pinned ? `<span class="pin" aria-label="Fixada">●</span> ` : ""}${esc(note.title)}</h3>
          ${note.tags.length ? `<p class="meta">${note.tags.map((tag) => `#${esc(tag)}`).join(" ")}</p>` : ""}
        </div>
      </div>
      <div class="rich">${renderRich(note.content, note.id)}</div>
      <div class="note-foot">
        <small>${esc(formatDay(updated, { day: "numeric", month: "short", year: "numeric" }))}</small>
        <div class="btn-row">
          <button type="button" class="btn btn-quiet btn-small" data-action="pin-note" data-id="${esc(note.id)}">${note.pinned ? "Desafixar" : "Fixar"}</button>
          <button type="button" class="btn btn-quiet btn-small" data-action="edit-note" data-id="${esc(note.id)}">Editar</button>
          <button type="button" class="btn btn-quiet btn-small" data-action="delete-note" data-id="${esc(note.id)}">Excluir</button>
        </div>
      </div>
    </article>`;
}

/* ============================================================ CALENDÁRIO */

function calendarPage() {
  const { year, month } = calendarMonth;
  const index = indexState(state);
  const grid = monthGrid(year, month);
  const stats = monthStats(state, year, month, currentDay, index);
  const victoryDays = getVictoryDays(state);
  const title = cap(new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
  const detail = summarizeDay(state, calendarDay, index);
  const status = dayStatus(detail, calendarDay, currentDay);
  const tasks = tasksForDay(state, calendarDay);

  const statusLabel = {
    victory: "Dia de vitória",
    partial: "Parcial",
    missed: "Não cumprido",
    pending: "Em andamento",
    empty: "Sem tarefas"
  }[status];

  return `
    <article class="card" aria-labelledby="month-title">
      <div class="card-head">
        <button type="button" class="icon-btn" aria-label="Mês anterior" data-action="month-step" data-step="-1">‹</button>
        <h2 id="month-title" class="center">${esc(title)}</h2>
        <button type="button" class="icon-btn" aria-label="Próximo mês" data-action="month-step" data-step="1">›</button>
      </div>
      <div class="weekdays" aria-hidden="true">${WEEKDAY_LETTERS.map((letter) => `<span>${letter}</span>`).join("")}</div>
      <div class="calendar-grid">
        ${grid
          .map((day) => {
            const summary = summarizeDay(state, day.key, index);
            const dayState = dayStatus(summary, day.key, currentDay);
            const classes = ["cal-day", `is-${dayState}`, day.inMonth ? "" : "outside", day.key === currentDay ? "today" : "", day.key === calendarDay ? "selected" : ""]
              .filter(Boolean)
              .join(" ");
            return `<button type="button" class="${classes}" aria-pressed="${day.key === calendarDay}"
              aria-label="${esc(formatDay(day.key, { day: "numeric", month: "long" }))}${dayState === "victory" ? ", dia de vitória" : ""}"
              data-action="select-date" data-day="${day.key}">${day.label}</button>`;
          })
          .join("")}
      </div>
      <div class="legend" aria-hidden="true">
        <span><i class="lg victory"></i>Vitória</span>
        <span><i class="lg partial"></i>Parcial</span>
        <span><i class="lg missed"></i>Não cumprido</span>
      </div>
    </article>

    <section class="stats" aria-label="Resumo do mês">
      <div class="stat"><span class="stat-label">Vitórias</span><strong>${stats.victories}</strong><small>no mês</small></div>
      <div class="stat"><span class="stat-label">Taxa</span><strong>${stats.rate}<i>%</i></strong><small>${stats.trackedDays} ${stats.trackedDays === 1 ? "dia" : "dias"} com tarefas</small></div>
      <div class="stat"><span class="stat-label">Streak</span><strong>${calculateStreak(victoryDays, currentDay)}</strong><small>recorde ${bestStreak(victoryDays)}</small></div>
    </section>

    <article class="card" aria-labelledby="day-title">
      <p class="eyebrow">${esc(statusLabel)}</p>
      <h2 id="day-title">${esc(cap(formatDay(calendarDay, { weekday: "long", day: "numeric", month: "long" })))}</h2>
      ${
        tasks.length
          ? `<ul class="task-list readonly">${tasks
              .map(
                (task) =>
                  `<li class="task${task.completed ? " done" : ""}"><span class="check static" aria-hidden="true">${task.completed ? CHECK_ICON : ""}</span><span class="task-title">${esc(task.title)}</span></li>`
              )
              .join("")}</ul>`
          : `<p class="empty">Nenhuma tarefa neste dia.</p>`
      }
      <dl class="facts">
        <div><dt>Água</dt><dd>${detail.waterMl} ml</dd></div>
        <div><dt>Alertas</dt><dd>${detail.alertsDone}/${detail.alertsTotal}</dd></div>
        <div><dt>Treinos</dt><dd>${detail.workouts}</dd></div>
        <div><dt>Notas</dt><dd>${detail.notes}</dd></div>
      </dl>
    </article>
  `;
}

/* ============================================================== AJUSTES */

function settingsPage() {
  return `
    <article class="card" aria-labelledby="profile-title">
      <p class="eyebrow">Perfil</p>
      <h2 id="profile-title">Seu Magno Space</h2>
      <form class="form" data-form="save-settings" autocomplete="off">
        <label>Nome <input name="name" maxlength="${LIMITS.name}" value="${esc(state.settings.name)}" placeholder="Como quer ser chamado?" /></label>
        <label>Meta diária de água (ml) <input name="waterGoalMl" type="number" inputmode="numeric" min="${LIMITS.waterGoalMin}" max="${LIMITS.waterGoalMax}" step="100" value="${state.settings.waterGoalMl}" /></label>
        <button type="submit" class="btn btn-primary">Salvar ajustes</button>
      </form>
    </article>

    <article class="card" aria-labelledby="backup-title">
      <p class="eyebrow">Backup</p>
      <h2 id="backup-title">Proteja seus dados</h2>
      <div class="btn-row pair">
        <button type="button" class="btn" data-action="export-backup">Exportar backup</button>
        <label class="btn file-btn">Importar backup
          <input type="file" class="sr-only" accept="application/json,.json" data-field="import-backup" />
        </label>
      </div>
      <p class="hint">Seus dados ficam somente neste aparelho. Exporte um backup antes de trocar de celular ou limpar os dados do navegador.</p>
    </article>

    <article class="card danger" aria-labelledby="data-title">
      <p class="eyebrow">Zona de risco</p>
      <h2 id="data-title">Apagar tudo</h2>
      <p class="hint">Remove tarefas, treinos, notas e histórico deste aparelho. Exporte um backup antes.</p>
      <button type="button" class="btn btn-danger" data-action="wipe-data">Apagar todos os dados</button>
    </article>

    <p class="about">Magno Space · versão ${esc(APP_VERSION)}</p>
  `;
}

/* ============================================================ SOBREPOSIÇÕES */

function openOverlay(html) {
  overlayReturnFocus ||= document.activeElement;
  overlayRoot.innerHTML = html;
  appEl.inert = true;
  overlayRoot.querySelector("[data-autofocus]")?.focus();
}

function closeOverlay() {
  overlayRoot.innerHTML = "";
  appEl.inert = false;
  overlayReturnFocus?.focus?.({ preventScroll: true });
  overlayReturnFocus = null;
}

function overlayOpen() {
  return overlayRoot.childElementCount > 0;
}

function ouroborosOverlay({ lostStreak }) {
  return `
    <div class="overlay overlay-ouro" role="alertdialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
      <div class="overlay-card">
        ${ouroborosSvg()}
        <p class="eyebrow">${lostStreak > 0 ? `Sequência perdida: ${esc(plural(lostStreak, "dia", "dias"))}` : "Sequência quebrada"}</p>
        <h2 id="ov-title">${esc(OUROBOROS_TEXT.line1)}</h2>
        <p id="ov-desc" class="ouro-line">${esc(OUROBOROS_TEXT.line2)}</p>
        <button type="button" class="btn btn-primary" data-action="dismiss-overlay" data-kind="ouroboros" data-autofocus>Recomeçar agora</button>
      </div>
    </div>`;
}

function victoryOverlay(message) {
  return `
    <div class="overlay overlay-victory" role="dialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
      <div class="overlay-card">
        <svg class="seal" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="seal-ring" cx="60" cy="60" r="52"/>
          <path class="seal-check" d="M36 62l16 16 32-34"/>
        </svg>
        <p class="eyebrow">${message.milestone ? "Marco desbloqueado" : "Registrado no calendário"}</p>
        <h2 id="ov-title">${esc(message.title)}</h2>
        <p id="ov-desc" class="overlay-body">${esc(message.body)}</p>
        <p class="streak-pill"><strong>${message.streak}</strong> ${message.streak === 1 ? "dia seguido" : "dias seguidos"}</p>
        <button type="button" class="btn btn-primary" data-action="dismiss-overlay" data-kind="victory" data-autofocus>Continuar</button>
      </div>
    </div>`;
}

function maybeShowOuroboros() {
  if (overlayOpen()) return;
  const broken = ouroborosBreak(state, currentDay);
  if (broken) openOverlay(ouroborosOverlay(broken));
}

function celebrateVictory() {
  if (state.ui.celebratedDays.includes(currentDay)) return;
  state.ui.celebratedDays = rememberFlag(state.ui.celebratedDays, currentDay);
  const streak = calculateStreak(getVictoryDays(state), currentDay);
  openOverlay(victoryOverlay(victoryMessage({ dayKey: currentDay, streak })));
}

/* =================================================================== AVISO */

function toast(message, undo = null) {
  clearTimeout(toastTimer);
  toastEl.hidden = false;
  toastEl.innerHTML = `<span>${esc(message)}</span>${undo ? `<button type="button" class="toast-action" data-action="toast-undo">Desfazer</button>` : ""}`;
  toastEl.undo = undo;
  toastTimer = setTimeout(hideToast, undo ? 6000 : 3500);
}

function hideToast() {
  clearTimeout(toastTimer);
  toastEl.hidden = true;
  toastEl.undo = null;
}

/* ================================================================ AÇÕES */

function persist() {
  saveState(state).then((ok) => {
    if (!ok && !saveWarned) {
      saveWarned = true;
      toast("Não foi possível salvar neste navegador. Exporte um backup.");
    }
  });
}

function commit(...pages) {
  persist();
  refresh(...pages);
}

const ACTIONS = {
  "plan-day"(el) {
    planDay = el.dataset.day === "tomorrow" ? addDays(currentDay, 1) : currentDay;
    renderPage("today");
  },

  "toggle-task"(el) {
    const task = state.tasks.find((item) => item.id === el.dataset.id);
    if (!task) return;
    const wasWon = isVictoriousDay(tasksForDay(state, task.dayKey));
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    upsertDailyFromTasks(state, task.dayKey);
    commit("today", "calendar");
    if (!wasWon && task.dayKey === currentDay && isVictoriousDay(tasksForDay(state, currentDay))) {
      celebrateVictory();
      persist();
    }
  },

  "delete-task"(el) {
    const index = state.tasks.findIndex((item) => item.id === el.dataset.id);
    if (index === -1) return;
    const [task] = state.tasks.splice(index, 1);
    upsertDailyFromTasks(state, task.dayKey);
    commit("today", "calendar");
    toast("Tarefa excluída.", () => {
      state.tasks.splice(Math.min(index, state.tasks.length), 0, task);
      upsertDailyFromTasks(state, task.dayKey);
      commit("today", "calendar");
    });
  },

  "carry-over"() {
    const candidates = carryOverCandidates(state, addDays(currentDay, -1), currentDay);
    const now = Date.now();
    candidates.forEach((task, offset) => {
      state.tasks.push({
        id: uid("task"),
        title: task.title,
        dayKey: currentDay,
        completed: false,
        createdAt: new Date(now + offset).toISOString(),
        completedAt: null
      });
    });
    upsertDailyFromTasks(state, currentDay);
    commit("today", "calendar");
    toast(`${plural(candidates.length, "tarefa trazida", "tarefas trazidas")} de ontem.`);
  },

  "toggle-alert"(el) {
    toggleAlert(state, currentDay, el.dataset.id);
    commit("today", "calendar");
  },

  "toggle-alerts-edit"() {
    alertsEditing = !alertsEditing;
    renderPage("today");
  },

  "remove-alert"(el) {
    const removed = removeAlert(state, el.dataset.id);
    if (!removed) return;
    commit("today", "calendar");
    toast(`Alerta "${removed.alert.label}" removido.`, () => {
      state.alerts.splice(Math.min(removed.index, state.alerts.length), 0, removed.alert);
      commit("today", "calendar");
    });
  },

  "add-water"(el) {
    addWater(state, currentDay, Number(el.dataset.amount));
    commit("today", "calendar");
  },

  "workout-day"(el) {
    workoutDay = el.dataset.day;
    renderPage("workouts");
  },

  "workout-week"(el) {
    workoutDay = addDays(workoutDay, Number(el.dataset.step) * 7);
    renderPage("workouts");
  },

  "repeat-workout"() {
    const source = lastSessionBefore(state.workouts, workoutDay);
    if (!source) return;
    const copies = state.workouts.filter((item) => item.dayKey === source).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const now = Date.now();
    copies.forEach((item, offset) => {
      state.workouts.push({ ...item, id: uid("workout"), dayKey: workoutDay, createdAt: new Date(now + offset).toISOString() });
    });
    commit("workouts", "calendar");
    toast(`${plural(copies.length, "exercício copiado", "exercícios copiados")}. Ajuste as cargas.`);
  },

  "delete-workout"(el) {
    const index = state.workouts.findIndex((item) => item.id === el.dataset.id);
    if (index === -1) return;
    const [workout] = state.workouts.splice(index, 1);
    commit("workouts", "calendar");
    toast("Exercício excluído.", () => {
      state.workouts.splice(Math.min(index, state.workouts.length), 0, workout);
      commit("workouts", "calendar");
    });
  },

  "notes-compose"() {
    notesUi.composing = !notesUi.composing;
    notesUi.editingId = null;
    renderPage("notes");
    if (notesUi.composing) document.querySelector('[data-form="add-note"] input[name="title"]')?.focus();
  },

  "notes-cancel"() {
    notesUi.composing = false;
    notesUi.editingId = null;
    renderPage("notes");
  },

  "filter-tag"(el) {
    notesUi.tag = notesUi.tag === el.dataset.tag ? "" : el.dataset.tag;
    renderPage("notes");
  },

  "pin-note"(el) {
    const note = state.notes.find((item) => item.id === el.dataset.id);
    if (!note) return;
    note.pinned = !note.pinned;
    commit("notes");
  },

  "edit-note"(el) {
    notesUi.editingId = el.dataset.id;
    notesUi.composing = false;
    renderPage("notes");
  },

  "delete-note"(el) {
    const index = state.notes.findIndex((item) => item.id === el.dataset.id);
    if (index === -1) return;
    const [note] = state.notes.splice(index, 1);
    commit("notes", "calendar");
    toast("Nota excluída.", () => {
      state.notes.splice(Math.min(index, state.notes.length), 0, note);
      commit("notes", "calendar");
    });
  },

  "toggle-note-check"(el) {
    const note = state.notes.find((item) => item.id === el.dataset.id);
    if (!note) return;
    note.content = toggleCheckLine(note.content, Number(el.dataset.line));
    note.updatedAt = new Date().toISOString();
    commit("notes");
  },

  "month-step"(el) {
    const date = new Date(calendarMonth.year, calendarMonth.month + Number(el.dataset.step), 1);
    calendarMonth = { year: date.getFullYear(), month: date.getMonth() };
    renderPage("calendar");
  },

  "select-date"(el) {
    calendarDay = el.dataset.day;
    const month = monthOf(calendarDay);
    if (month.year !== calendarMonth.year || month.month !== calendarMonth.month) calendarMonth = month;
    renderPage("calendar");
  },

  "export-backup"() {
    const payload = JSON.stringify(exportState(state), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `magno-space-backup-${currentDay}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Backup exportado.");
  },

  async "wipe-data"() {
    if (!confirm("Apagar TODOS os dados deste aparelho? Essa ação não pode ser desfeita.")) return;
    if (!confirm("Última confirmação: tarefas, treinos, notas e histórico serão apagados.")) return;
    await wipeState();
    state = createInitialState();
    resetUi();
    persist();
    refresh();
    toast("Dados apagados.");
  },

  "toast-undo"() {
    const undo = toastEl.undo;
    hideToast();
    undo?.();
  },

  "dismiss-overlay"(el) {
    if (el.dataset.kind === "ouroboros") {
      const broken = ouroborosBreak(state, currentDay);
      if (broken) state.ui.ouroborosSeenFor = rememberFlag(state.ui.ouroborosSeenFor, broken.brokenOn);
    }
    persist();
    closeOverlay();
    refresh("today");
  }
};

const FORMS = {
  "add-task"(form, data) {
    const title = String(data.get("title") ?? "").replace(/\s+/g, " ").trim();
    if (!title) return;
    if (tasksForDay(state, planDay).length >= LIMITS.tasksPerDay) {
      toast(`Limite de ${LIMITS.tasksPerDay} tarefas por dia.`);
      return;
    }
    state.tasks.push({
      id: uid("task"),
      title: title.slice(0, LIMITS.taskTitle),
      dayKey: planDay,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    upsertDailyFromTasks(state, planDay);
    form.reset();
    commit("today", "calendar");
    document.querySelector('[data-form="add-task"] input[name="title"]')?.focus({ preventScroll: true });
  },

  "add-alert"(form, data) {
    const result = addAlert(state, data.get("label"));
    if (!result.ok) {
      toast({ duplicado: "Esse alerta já existe.", limite: `Limite de ${LIMITS.maxAlerts} alertas atingido.`, vazio: "Escreva o alerta." }[result.reason]);
      return;
    }
    form.reset();
    commit("today");
    document.querySelector('[data-form="add-alert"] input[name="label"]')?.focus({ preventScroll: true });
  },

  "add-workout"(form, data) {
    const name = String(data.get("name") ?? "").replace(/\s+/g, " ").trim();
    if (!name) return;
    state.workouts.push({
      id: uid("workout"),
      dayKey: workoutDay,
      name: name.slice(0, LIMITS.exerciseName),
      sets: String(data.get("sets") || "3").slice(0, 3),
      reps: String(data.get("reps") || "10").slice(0, 12),
      load: String(data.get("load") ?? "").trim().slice(0, 10),
      notes: String(data.get("notes") ?? "").trim().slice(0, LIMITS.workoutNotes),
      createdAt: new Date().toISOString()
    });
    commit("workouts", "calendar");
    toast("Exercício registrado.");
  },

  "add-note"(form, data) {
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const now = new Date().toISOString();
    state.notes.push({
      id: uid("note"),
      title: title.slice(0, LIMITS.noteTitle),
      content: String(data.get("content") ?? "").replace(/\r\n?/g, "\n").slice(0, LIMITS.noteContent),
      tags: parseTags(data.get("tags")),
      pinned: false,
      createdAt: now,
      updatedAt: now
    });
    notesUi.composing = false;
    commit("notes", "calendar");
  },

  "edit-note"(form, data) {
    const note = state.notes.find((item) => item.id === form.dataset.id);
    if (!note) return;
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    note.title = title.slice(0, LIMITS.noteTitle);
    note.content = String(data.get("content") ?? "").replace(/\r\n?/g, "\n").slice(0, LIMITS.noteContent);
    note.tags = parseTags(data.get("tags"));
    note.updatedAt = new Date().toISOString();
    notesUi.editingId = null;
    commit("notes", "calendar");
  },

  "save-settings"(form, data) {
    state.settings.name = String(data.get("name") ?? "").trim().slice(0, LIMITS.name);
    const goal = Math.round(Number(data.get("waterGoalMl")));
    if (Number.isFinite(goal)) state.settings.waterGoalMl = clamp(goal, LIMITS.waterGoalMin, LIMITS.waterGoalMax);
    commit("today", "settings");
    toast("Ajustes salvos.");
  }
};

function resetUi() {
  currentDay = todayKey();
  planDay = currentDay;
  workoutDay = currentDay;
  calendarDay = currentDay;
  calendarMonth = monthOf(currentDay);
  alertsEditing = false;
  notesUi = { query: "", tag: "", composing: false, editingId: null };
}

async function importBackup(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    toast("O arquivo é grande demais para ser um backup.");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    toast("Não consegui ler esse arquivo. Ele não é um JSON válido.");
    return;
  }

  const problem = backupProblem(payload);
  if (problem) {
    toast(problem);
    return;
  }

  if (!confirm("Substituir todos os dados atuais pelo backup? Essa ação não pode ser desfeita.")) return;
  state = normalizeState(payload.data);
  resetUi();
  persist();
  refresh();
  toast("Backup importado.");
}

/* ============================================================== EVENTOS */

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const handler = ACTIONS[el.dataset.action];
  if (handler) handler(el, event);
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  FORMS[form.dataset.form]?.(form, new FormData(form));
});

document.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  if (field.dataset.field === "note-search") {
    notesUi.query = field.value;
    document.querySelector("#notes-list").innerHTML = notesList();
  }

  if (field.dataset.field === "exercise-name") {
    const hint = document.querySelector("#exercise-hint");
    const found = exerciseStats(state.workouts).find((item) => item.key === exerciseKey(field.value));
    if (!hint) return;
    hint.textContent = found?.last != null ? `Último registro: ${formatKg(found.last)} · melhor ${formatKg(found.best)}` : found ? "Exercício já registrado, sem carga numérica." : "";
  }
});

document.addEventListener("change", async (event) => {
  const field = event.target.closest('[data-field="import-backup"]');
  if (!field) return;
  const file = field.files?.[0];
  field.value = "";
  await importBackup(file);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (overlayOpen()) overlayRoot.querySelector('[data-action="dismiss-overlay"]')?.click();
  else if (!toastEl.hidden) hideToast();
});

/* ======================================================= NAVEGAÇÃO (SWIPE) */

let scrollFrame = 0;
let settleTimer = 0;

function pageWidth() {
  return pager.clientWidth || 1;
}

function goTo(index, smooth = true) {
  const target = clamp(index, 0, PAGE_IDS.length - 1);
  pager.scrollTo({ left: target * pageWidth(), behavior: smooth && !reducedMotion ? "smooth" : "auto" });
}

function setActive(index) {
  activeIndex = index;
  tabEls.forEach((tab, position) => {
    const on = position === index;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
  });
}

// O indicador acompanha o dedo: interpola entre duas abas enquanto a tela desliza.
function updateIndicator() {
  const progress = clamp(pager.scrollLeft / pageWidth(), 0, PAGE_IDS.length - 1);
  const from = Math.floor(progress);
  const fraction = progress - from;
  const a = tabEls[from];
  const b = tabEls[Math.min(from + 1, tabEls.length - 1)];
  const left = a.offsetLeft + (b.offsetLeft - a.offsetLeft) * fraction;
  const width = a.offsetWidth + (b.offsetWidth - a.offsetWidth) * fraction;
  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${left}px)`;

  const nearest = Math.round(progress);
  if (nearest !== activeIndex) setActive(nearest);
}

function settle() {
  const index = clamp(Math.round(pager.scrollLeft / pageWidth()), 0, PAGE_IDS.length - 1);
  setActive(index);
  pageEls.forEach((page, position) => {
    page.inert = position !== index;
  });
  updateIndicator();
}

pager.addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) {
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        updateIndicator();
      });
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 110);
  },
  { passive: true }
);

tabsEl.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  const index = Number(tab.dataset.tab);
  if (index === activeIndex) pageEls[index].scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  else goTo(index);
});

tabsEl.addEventListener("keydown", (event) => {
  const keys = { ArrowRight: 1, ArrowLeft: -1 };
  let target = null;
  if (event.key in keys) target = clamp(activeIndex + keys[event.key], 0, tabEls.length - 1);
  if (event.key === "Home") target = 0;
  if (event.key === "End") target = tabEls.length - 1;
  if (target === null) return;
  event.preventDefault();
  goTo(target);
  tabEls[target].focus();
});

new ResizeObserver(() => {
  goTo(activeIndex, false);
  updateIndicator();
}).observe(pager);

/* ================================================ VIRADA DE DIA E RELÓGIO */

function checkDayRollover() {
  const now = todayKey();
  if (now === currentDay) return false;
  resetUi();
  refresh();
  maybeShowOuroboros();
  return true;
}

function tick() {
  if (checkDayRollover()) return;
  const hour = new Date().getHours();
  const typing = document.activeElement?.closest?.("input, textarea");
  if (hour !== lastRenderedHour && !typing && !overlayOpen()) {
    lastRenderedHour = hour;
    renderPage("today");
  }
}

setInterval(tick, 30000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tick();
});

/* ===================================================================== INÍCIO */

refresh();
setActive(0);
pageEls.forEach((page, position) => {
  page.inert = position !== 0;
});
updateIndicator();
document.fonts?.ready.then(updateIndicator);
persist();
maybeShowOuroboros();
navigator.storage?.persist?.().catch(() => {});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
