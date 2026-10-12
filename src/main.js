import {
  addDays,
  bestStreak,
  calculateStreak,
  exportState,
  getVictoryDays,
  markQuoteForDay,
  monthGrid,
  shouldShowOuroboros,
  summarizeDay,
  tasksForDay,
  todayKey,
  uid,
  upsertDailyFromTasks,
  validateBackup
} from "./domain.js";
import { loadState, saveState } from "./store.js";

const app = document.querySelector("#app");
let state = await loadState();
let route = "today";
let selectedDay = todayKey();
let selectedCalendarDate = new Date();
let saveTimer = null;

markQuoteForDay(state, selectedDay);
await persist();
registerServiceWorker();
render();

function render() {
  const today = todayKey();
  const victoryDays = getVictoryDays(state);
  const currentStreak = calculateStreak(victoryDays, today);
  const quote = markQuoteForDay(state, today);
  const ouroboros = shouldShowOuroboros(state, today);

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Magno Space</p>
          <h1>${state.settings.name ? `Forca, ${escapeHtml(state.settings.name)}` : "Painel de conquista"}</h1>
        </div>
        <div class="streak" aria-label="Sequencia atual">
          <strong>${currentStreak}</strong>
          <span>streak</span>
        </div>
      </header>

      ${ouroboros ? ouroborosView() : ""}
      ${route === "today" ? todayView(quote, currentStreak) : ""}
      ${route === "tasks" ? tasksView() : ""}
      ${route === "workouts" ? workoutsView() : ""}
      ${route === "notes" ? notesView() : ""}
      ${route === "habits" ? habitsView() : ""}
      ${route === "calendar" ? calendarView() : ""}
      ${route === "settings" ? settingsView() : ""}

      <nav class="tabbar" aria-label="Navegacao principal">
        ${navButton("today", "Hoje")}
        ${navButton("tasks", "Tarefas")}
        ${navButton("workouts", "Treinos")}
        ${navButton("notes", "Notas")}
        ${navButton("habits", "Habitos")}
        ${navButton("calendar", "Calendario")}
        ${navButton("settings", "Ajustes")}
      </nav>
    </main>
  `;

  bindEvents();
}

function todayView(quote, currentStreak) {
  const today = todayKey();
  const tasks = tasksForDay(state, today);
  const summary = summarizeDay(state, today);
  const victorious = summary.victorious;
  const waterGoal = state.settings.waterGoalMl || 2500;
  const waterPercent = Math.min(100, Math.round((summary.waterMl / waterGoal) * 100));

  return `
    <section class="hero ${victorious ? "is-victory" : ""}">
      <p class="eyebrow">Frase do dia</p>
      <blockquote>${escapeHtml(quote?.text || "Aja hoje.")}</blockquote>
      <span>${escapeHtml(quote?.source || "Magno Space")}</span>
    </section>

    <section class="grid two">
      <article class="panel metric">
        <span>Hoje</span>
        <strong>${summary.completedTasks}/${summary.totalTasks}</strong>
        <small>tarefas concluidas</small>
      </article>
      <article class="panel metric">
        <span>Agua</span>
        <strong>${summary.waterMl} ml</strong>
        <small>${waterPercent}% da meta</small>
      </article>
    </section>

    ${victorious ? `<section class="victory">Dia registrado como vitoria. Honre o ritmo amanha.</section>` : ""}

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Checklist</p>
          <h2>Tarefas de hoje</h2>
        </div>
        <button class="icon-btn" data-route="tasks" aria-label="Abrir tarefas">+</button>
      </div>
      ${taskList(tasks)}
      <form class="quick-form" data-action="add-task">
        <input name="title" placeholder="Nova tarefa decisiva" autocomplete="off" required />
        <button type="submit">Adicionar</button>
      </form>
    </section>

    <section class="quick-actions">
      <button data-action="add-water" data-amount="250">+250 ml</button>
      <button data-route="workouts">Treino</button>
      <button data-route="notes">Nota</button>
      <button data-action="tomorrow-task">Amanha</button>
    </section>

    <section class="panel">
      <p class="eyebrow">Alertas do dia</p>
      <div class="habit-line">
        ${habitChip("resistedSugar", "Sem acucar")}
        ${habitChip("resistedUltraProcessed", "Sem ultraprocessados")}
        ${habitChip("resistedFastFood", "Sem fast food")}
      </div>
    </section>
  `;
}

function tasksView() {
  const tomorrow = addDays(todayKey(), 1);
  return `
    <section class="panel">
      <div class="segmented">
        <button class="${selectedDay === todayKey() ? "active" : ""}" data-day="${todayKey()}">Hoje</button>
        <button class="${selectedDay === tomorrow ? "active" : ""}" data-day="${tomorrow}">Amanha</button>
      </div>
      <form class="stack-form" data-action="add-task">
        <label>Nova tarefa
          <input name="title" placeholder="Ex: estudar 40 minutos" autocomplete="off" required />
        </label>
        <button type="submit">Criar tarefa</button>
      </form>
    </section>
    <section class="panel">
      <h2>${selectedDay === todayKey() ? "Tarefas de hoje" : "Planejamento de amanha"}</h2>
      ${taskList(tasksForDay(state, selectedDay))}
    </section>
  `;
}

function workoutsView() {
  const workouts = state.workouts.filter((workout) => workout.dayKey === selectedDay);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Musculacao</p>
          <h2>Treino de ${formatDay(selectedDay)}</h2>
        </div>
        <button data-action="duplicate-workout">Duplicar</button>
      </div>
      <form class="stack-form" data-action="add-workout">
        <label>Exercicio <input name="name" placeholder="Supino reto" required /></label>
        <div class="form-row">
          <label>Series <input name="sets" type="number" min="1" value="3" /></label>
          <label>Reps <input name="reps" type="text" value="10" /></label>
          <label>Carga <input name="load" type="text" placeholder="40 kg" /></label>
        </div>
        <label>Observacoes <input name="notes" placeholder="Controle, tecnica, progresso" /></label>
        <button type="submit">Registrar exercicio</button>
      </form>
    </section>
    <section class="list">
      ${workouts.length ? workouts.map(workoutCard).join("") : emptyState("Nenhum exercicio registrado hoje.")}
    </section>
  `;
}

function notesView() {
  const notes = [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return `
    <section class="panel">
      <p class="eyebrow">Notas</p>
      <h2>Reflexoes e aprendizados</h2>
      <form class="stack-form" data-action="add-note">
        <label>Titulo <input name="title" placeholder="Ideia, leitura ou reflexao" required /></label>
        <label>Conteudo <textarea name="content" rows="5" placeholder="Escreva sem perder o fluxo..."></textarea></label>
        <label>Tags <input name="tags" placeholder="leitura, estrategia" /></label>
        <button type="submit">Salvar nota</button>
      </form>
    </section>
    <section class="list">
      ${notes.length ? notes.map(noteCard).join("") : emptyState("Seu bloco de notas esta limpo.")}
    </section>
  `;
}

function habitsView() {
  const day = state.daily[todayKey()] || {};
  const goal = state.settings.waterGoalMl;
  return `
    <section class="panel">
      <p class="eyebrow">Hidratacao</p>
      <h2>${day.waterMl || 0} ml / ${goal} ml</h2>
      <div class="progress"><span style="width:${Math.min(100, ((day.waterMl || 0) / goal) * 100)}%"></span></div>
      <div class="quick-actions in-panel">
        <button data-action="add-water" data-amount="250">+250 ml</button>
        <button data-action="add-water" data-amount="500">+500 ml</button>
        <button data-action="add-water" data-amount="-250">-250 ml</button>
      </div>
      <form class="stack-form" data-action="set-water-goal">
        <label>Meta diaria em ml <input name="waterGoalMl" type="number" min="500" step="100" value="${goal}" /></label>
        <button type="submit">Atualizar meta</button>
      </form>
    </section>
    <section class="panel">
      <p class="eyebrow">Resistencia</p>
      <h2>Evitar o que enfraquece o processo</h2>
      <div class="habit-line vertical">
        ${habitChip("resistedSugar", "Resisti ao acucar")}
        ${habitChip("resistedUltraProcessed", "Resisti aos ultraprocessados")}
        ${habitChip("resistedFastFood", "Resisti ao fast food")}
      </div>
    </section>
  `;
}

function calendarView() {
  const year = selectedCalendarDate.getFullYear();
  const month = selectedCalendarDate.getMonth();
  const days = monthGrid(year, month);
  const today = todayKey();
  const victoryDays = getVictoryDays(state);
  const selectedSummary = summarizeDay(state, selectedDay);

  return `
    <section class="panel">
      <div class="section-head">
        <button class="icon-btn" data-action="previous-month" aria-label="Mes anterior">‹</button>
        <h2>${selectedCalendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
        <button class="icon-btn" data-action="next-month" aria-label="Proximo mes">›</button>
      </div>
      <div class="weekdays">${["D", "S", "T", "Q", "Q", "S", "S"].map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="calendar-grid">
        ${days
          .map((day) => {
            const summary = summarizeDay(state, day.key);
            const classes = [
              day.inMonth ? "" : "muted",
              day.key === today ? "today" : "",
              day.key === selectedDay ? "selected" : "",
              summary.victorious ? "victorious" : summary.totalTasks ? "incomplete" : ""
            ].join(" ");
            return `<button class="${classes}" data-select-date="${day.key}">${day.label}</button>`;
          })
          .join("")}
      </div>
    </section>
    <section class="panel">
      <p class="eyebrow">Resumo</p>
      <h2>${formatDay(selectedDay)}</h2>
      <div class="summary-list">
        <span>Tarefas: ${selectedSummary.completedTasks}/${selectedSummary.totalTasks}</span>
        <span>Agua: ${selectedSummary.waterMl} ml</span>
        <span>Treinos: ${selectedSummary.workouts}</span>
        <span>Notas: ${selectedSummary.notes}</span>
        <span>Streak atual: ${calculateStreak(victoryDays, today)}</span>
        <span>Melhor streak: ${bestStreak(victoryDays)}</span>
      </div>
    </section>
  `;
}

function settingsView() {
  return `
    <section class="panel">
      <p class="eyebrow">Ajustes</p>
      <h2>Seu Magno Space</h2>
      <form class="stack-form" data-action="save-settings">
        <label>Nome <input name="name" value="${escapeAttr(state.settings.name)}" placeholder="Como quer ser chamado?" /></label>
        <label>Meta de agua <input name="waterGoalMl" type="number" min="500" step="100" value="${state.settings.waterGoalMl}" /></label>
        <button type="submit">Salvar ajustes</button>
      </form>
    </section>
    <section class="panel">
      <p class="eyebrow">Backup</p>
      <h2>Proteja seus dados</h2>
      <div class="quick-actions in-panel">
        <button data-action="export-backup">Exportar JSON</button>
        <label class="file-button">Importar JSON<input type="file" accept="application/json" data-action="import-backup" /></label>
      </div>
      <small class="hint">Os dados ficam neste navegador. Exporte backup antes de trocar de aparelho ou limpar dados.</small>
    </section>
  `;
}

function ouroborosView() {
  return `
    <section class="ouroboros" role="dialog" aria-label="Quebra de ciclo">
      <div class="ring" aria-hidden="true"></div>
      <div>
        <p>Se renda a mudanca ou sofra em um ciclo.</p>
        <strong>Quebre o ciclo ou ele te quebrara.</strong>
      </div>
      <button data-action="dismiss-ouroboros">Continuar</button>
    </section>
  `;
}

function taskList(tasks) {
  if (!tasks.length) return emptyState("Nenhuma tarefa cadastrada para este dia.");
  return `<div class="task-list">${tasks.map(taskItem).join("")}</div>`;
}

function taskItem(task) {
  return `
    <article class="task ${task.completed ? "done" : ""}">
      <button class="check" data-action="toggle-task" data-id="${task.id}" aria-label="Alternar tarefa">${task.completed ? "✓" : ""}</button>
      <span>${escapeHtml(task.title)}</span>
      <button class="ghost" data-action="delete-task" data-id="${task.id}" aria-label="Excluir tarefa">Excluir</button>
    </article>
  `;
}

function workoutCard(workout) {
  return `
    <article class="panel compact">
      <div class="section-head">
        <div>
          <h3>${escapeHtml(workout.name)}</h3>
          <p>${escapeHtml(workout.sets)} series · ${escapeHtml(workout.reps)} reps · ${escapeHtml(workout.load || "sem carga")}</p>
        </div>
        <button class="ghost" data-action="delete-workout" data-id="${workout.id}">Excluir</button>
      </div>
      ${workout.notes ? `<small>${escapeHtml(workout.notes)}</small>` : ""}
    </article>
  `;
}

function noteCard(note) {
  return `
    <article class="panel compact">
      <div class="section-head">
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.tags.join(", "))}</p>
        </div>
        <button class="ghost" data-action="delete-note" data-id="${note.id}">Excluir</button>
      </div>
      <p>${escapeHtml(note.content || "").replace(/\n/g, "<br />")}</p>
    </article>
  `;
}

function habitChip(key, label) {
  const active = Boolean(state.daily[todayKey()]?.[key]);
  return `<button class="habit ${active ? "active" : ""}" data-action="toggle-habit" data-key="${key}">${label}</button>`;
}

function navButton(target, label) {
  return `<button class="${route === target ? "active" : ""}" data-route="${target}">${label}</button>`;
}

function emptyState(message) {
  return `<p class="empty">${message}</p>`;
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      route = button.dataset.route;
      render();
    });
  });

  document.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = button.dataset.day;
      render();
    });
  });

  document.querySelectorAll("[data-select-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDay = button.dataset.selectDate;
      render();
    });
  });

  document.querySelectorAll("form[data-action]").forEach((form) => {
    form.addEventListener("submit", handleForm);
  });

  document.querySelectorAll("button[data-action], input[data-action]").forEach((element) => {
    if (element.tagName === "FORM") return;
    element.addEventListener(element.type === "file" ? "change" : "click", handleAction);
  });
}

async function handleForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  if (form.dataset.action === "add-task") {
    state.tasks.push({
      id: uid("task"),
      title: data.title.trim(),
      dayKey: selectedDay,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    upsertDailyFromTasks(state, selectedDay);
  }

  if (form.dataset.action === "add-workout") {
    state.workouts.push({
      id: uid("workout"),
      dayKey: selectedDay,
      name: data.name.trim(),
      sets: data.sets || "3",
      reps: data.reps || "10",
      load: data.load || "",
      notes: data.notes || "",
      createdAt: new Date().toISOString()
    });
  }

  if (form.dataset.action === "add-note") {
    state.notes.push({
      id: uid("note"),
      title: data.title.trim(),
      content: data.content || "",
      tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  if (form.dataset.action === "set-water-goal" || form.dataset.action === "save-settings") {
    state.settings.waterGoalMl = Number(data.waterGoalMl) || state.settings.waterGoalMl;
    if ("name" in data) state.settings.name = data.name.trim();
  }

  form.reset();
  await persist();
  render();
}

async function handleAction(event) {
  const el = event.currentTarget;
  const action = el.dataset.action;
  const id = el.dataset.id;

  if (action === "toggle-task") {
    const task = state.tasks.find((item) => item.id === id);
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    upsertDailyFromTasks(state, task.dayKey);
  }

  if (action === "delete-task") {
    const task = state.tasks.find((item) => item.id === id);
    state.tasks = state.tasks.filter((item) => item.id !== id);
    if (task) upsertDailyFromTasks(state, task.dayKey);
  }

  if (action === "add-water") {
    const day = ensureDaily(todayKey());
    day.waterMl = Math.max(0, (day.waterMl || 0) + Number(el.dataset.amount));
  }

  if (action === "toggle-habit") {
    const day = ensureDaily(todayKey());
    day[el.dataset.key] = !day[el.dataset.key];
  }

  if (action === "tomorrow-task") {
    selectedDay = addDays(todayKey(), 1);
    route = "tasks";
  }

  if (action === "dismiss-ouroboros") {
    const yesterday = addDays(todayKey(), -1);
    state.ui.ouroborosSeenFor = [...new Set([...state.ui.ouroborosSeenFor, yesterday])];
  }

  if (action === "previous-month") selectedCalendarDate.setMonth(selectedCalendarDate.getMonth() - 1);
  if (action === "next-month") selectedCalendarDate.setMonth(selectedCalendarDate.getMonth() + 1);

  if (action === "delete-workout") state.workouts = state.workouts.filter((item) => item.id !== id);
  if (action === "delete-note") state.notes = state.notes.filter((item) => item.id !== id);

  if (action === "duplicate-workout") duplicateLastWorkout();
  if (action === "export-backup") downloadBackup();
  if (action === "import-backup") await importBackup(el.files?.[0]);

  await persist();
  render();
}

function ensureDaily(dayKey) {
  state.daily[dayKey] = state.daily[dayKey] || {};
  return state.daily[dayKey];
}

function duplicateLastWorkout() {
  const previous = [...state.workouts].filter((workout) => workout.dayKey < selectedDay).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  if (!previous.length) return;
  const sourceDay = previous[0].dayKey;
  state.workouts
    .filter((workout) => workout.dayKey === sourceDay)
    .forEach((workout) => {
      state.workouts.push({ ...workout, id: uid("workout"), dayKey: selectedDay, createdAt: new Date().toISOString() });
    });
}

function downloadBackup() {
  const payload = JSON.stringify(exportState(state), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `magno-space-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importBackup(file) {
  if (!file) return;
  const payload = JSON.parse(await file.text());
  if (!validateBackup(payload)) {
    alert("Backup invalido.");
    return;
  }
  const replace = confirm("Substituir todos os dados atuais pelo backup? Cancelar mantem os dados atuais.");
  if (replace) state = payload.data;
}

async function persist() {
  clearTimeout(saveTimer);
  await saveState(state);
}

function formatDay(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js");
  }
}
