import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ALERTS,
  LIMITS,
  SCHEMA_VERSION,
  addAlert,
  addDays,
  addWater,
  backupProblem,
  bestStreak,
  calculateStreak,
  carryOverCandidates,
  createInitialState,
  dayNumber,
  dayStatus,
  exerciseKey,
  exerciseStats,
  exportState,
  formatKg,
  isDayKey,
  isVictoriousDay,
  lastSessionBefore,
  monthGrid,
  monthStats,
  normalizeState,
  ouroborosBreak,
  parseLoad,
  parseTags,
  quoteForDay,
  removeAlert,
  shouldShowOuroboros,
  summarizeDay,
  todayKey,
  toggleAlert,
  upsertDailyFromTasks,
  validateBackup,
  waterPace,
  waterWeek,
  weekDays,
  workoutInsight
} from "../src/domain.js";
import { quotes } from "../src/quotes.js";

function task(dayKey, completed, title = "Tarefa") {
  return { id: `${dayKey}-${title}`, title, dayKey, completed, createdAt: `${dayKey}T10:00:00.000Z`, completedAt: null };
}

function winDay(state, dayKey) {
  state.tasks.push(task(dayKey, true, `ganhar-${dayKey}`));
  upsertDailyFromTasks(state, dayKey);
}

test("datas: formato local, virada de mês e de ano", () => {
  assert.equal(todayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(isDayKey("2026-02-30"), false);
  assert.equal(isDayKey("2026-10-14"), true);
  assert.equal(dayNumber("2026-10-15") - dayNumber("2026-10-14"), 1);
});

test("um dia vitorioso exige ao menos uma tarefa e todas concluídas", () => {
  assert.equal(isVictoriousDay([]), false);
  assert.equal(isVictoriousDay([{ completed: true }]), true);
  assert.equal(isVictoriousDay([{ completed: true }, { completed: false }]), false);
});

test("streak conta dias seguidos e continua viva enquanto hoje está aberto", () => {
  assert.equal(calculateStreak(["2026-10-08", "2026-10-09", "2026-10-10"], "2026-10-10"), 3);
  assert.equal(calculateStreak(["2026-10-08", "2026-10-10"], "2026-10-10"), 1);
  assert.equal(calculateStreak(["2026-10-08", "2026-10-09"], "2026-10-10"), 2);
  assert.equal(calculateStreak(["2026-10-07", "2026-10-08"], "2026-10-10"), 0);
});

test("bestStreak encontra a maior sequência", () => {
  assert.equal(bestStreak(["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"]), 3);
});

test("o resumo diário é derivado das tarefas, sem vitória automática em dia vazio", () => {
  const state = createInitialState();
  upsertDailyFromTasks(state, "2026-10-10");
  assert.equal(state.daily["2026-10-10"].victorious, false);

  state.tasks.push(task("2026-10-10", true));
  upsertDailyFromTasks(state, "2026-10-10");
  assert.equal(state.daily["2026-10-10"].victorious, true);
  assert.ok(state.daily["2026-10-10"].victoryRecordedAt);

  state.tasks.push(task("2026-10-10", false, "Nova"));
  upsertDailyFromTasks(state, "2026-10-10");
  assert.equal(state.daily["2026-10-10"].victorious, false);
  assert.equal(state.daily["2026-10-10"].victoryRecordedAt, null);
});

test("Ouroboros aparece uma vez quando a sequência quebra", () => {
  const state = createInitialState();
  winDay(state, "2026-10-07");
  winDay(state, "2026-10-08");
  const broken = ouroborosBreak(state, "2026-10-10");
  assert.deepEqual(broken, { brokenOn: "2026-10-09", lostStreak: 2 });
  state.ui.ouroborosSeenFor.push("2026-10-09");
  assert.equal(shouldShowOuroboros(state, "2026-10-10"), false);
});

test("Ouroboros cobre dia sem registro, sequência de 1 dia e várias ausências", () => {
  const oneDay = createInitialState();
  winDay(oneDay, "2026-10-08");
  assert.equal(shouldShowOuroboros(oneDay, "2026-10-10"), true);

  const away = createInitialState();
  winDay(away, "2026-09-01");
  assert.deepEqual(ouroborosBreak(away, "2026-10-10"), { brokenOn: "2026-09-02", lostStreak: 1 });
});

test("Ouroboros não aparece com sequência viva, sem histórico ou com hoje já vencido", () => {
  const alive = createInitialState();
  winDay(alive, "2026-10-09");
  assert.equal(shouldShowOuroboros(alive, "2026-10-10"), false);

  assert.equal(shouldShowOuroboros(createInitialState(), "2026-10-10"), false);

  const recovered = createInitialState();
  winDay(recovered, "2026-10-05");
  winDay(recovered, "2026-10-10");
  assert.equal(shouldShowOuroboros(recovered, "2026-10-10"), false);
});

test("frase do dia: estável no dia, muda no outro e percorre a biblioteca sem repetir", () => {
  assert.equal(quoteForDay(quotes, "2026-10-14").id, quoteForDay(quotes, "2026-10-14").id);
  assert.notEqual(quoteForDay(quotes, "2026-10-14").id, quoteForDay(quotes, "2026-10-15").id);

  const seen = new Set();
  for (let day = 0; day < quotes.length; day += 1) {
    seen.add(quoteForDay(quotes, addDays("2026-01-01", day)).id);
  }
  assert.equal(seen.size, quotes.length);
  assert.equal(quoteForDay([], "2026-10-14"), null);
});

test("calendário sempre devolve seis semanas e começa no domingo", () => {
  const grid = monthGrid(2026, 9);
  assert.equal(grid.length, 42);
  assert.equal(new Date(grid[0].key + "T12:00:00").getDay(), 0);
  assert.equal(grid.filter((day) => day.inMonth).length, 31);
});

test("weekDays devolve domingo a sábado", () => {
  const week = weekDays("2026-10-14");
  assert.equal(week.length, 7);
  assert.equal(week[0], "2026-10-11");
  assert.equal(week[6], "2026-10-17");
});

test("status do dia no calendário", () => {
  const state = createInitialState();
  winDay(state, "2026-10-10");
  state.tasks.push(task("2026-10-11", false, "a"), task("2026-10-11", true, "b"));
  state.tasks.push(task("2026-10-12", false, "c"));
  const status = (day) => dayStatus(summarizeDay(state, day), day, "2026-10-14");
  assert.equal(status("2026-10-10"), "victory");
  assert.equal(status("2026-10-11"), "partial");
  assert.equal(status("2026-10-12"), "missed");
  assert.equal(status("2026-10-13"), "empty");
});

test("estatística do mês", () => {
  const state = createInitialState();
  winDay(state, "2026-10-01");
  winDay(state, "2026-10-02");
  state.tasks.push(task("2026-10-03", false));
  assert.deepEqual(monthStats(state, 2026, 9, "2026-10-14"), { victories: 2, trackedDays: 3, rate: 67 });
});

test("alertas: adicionar, impedir duplicado, marcar e remover limpando o histórico", () => {
  const state = createInitialState();
  assert.equal(state.alerts.length, DEFAULT_ALERTS.length);

  const added = addAlert(state, "  Dormir   8h ");
  assert.equal(added.ok, true);
  assert.equal(added.alert.label, "Dormir 8h");
  assert.equal(addAlert(state, "dormir 8h").reason, "duplicado");
  assert.equal(addAlert(state, "   ").reason, "vazio");

  assert.equal(toggleAlert(state, "2026-10-14", added.alert.id), true);
  assert.equal(summarizeDay(state, "2026-10-14").alertsDone, 1);
  assert.equal(toggleAlert(state, "2026-10-14", added.alert.id), false);

  toggleAlert(state, "2026-10-14", added.alert.id);
  const removed = removeAlert(state, added.alert.id);
  assert.equal(removed.alert.label, "Dormir 8h");
  assert.equal(state.daily["2026-10-14"].alertsDone[added.alert.id], undefined);
  assert.equal(toggleAlert(state, "2026-10-14", "nao-existe"), false);
});

test("alertas respeitam o limite máximo", () => {
  const state = createInitialState();
  for (let index = 0; state.alerts.length < LIMITS.maxAlerts; index += 1) addAlert(state, `Alerta ${index}`);
  assert.equal(addAlert(state, "Mais um").reason, "limite");
});

test("água: soma, não fica negativa e acompanha o ritmo do dia", () => {
  const state = createInitialState();
  assert.equal(addWater(state, "2026-10-14", 500), 500);
  assert.equal(addWater(state, "2026-10-14", -900), 0);

  assert.equal(waterPace(2500, 2500).status, "done");
  assert.equal(waterPace(0, 2500, new Date(2026, 9, 14, 6, 0)).status, "ontrack");
  assert.equal(waterPace(0, 2500, new Date(2026, 9, 14, 14, 30)).status, "behind");
  assert.equal(waterPace(1500, 2500, new Date(2026, 9, 14, 14, 30)).status, "ontrack");

  const week = waterWeek(state, "2026-10-14", 2500);
  assert.equal(week.length, 7);
  assert.equal(week[6].dayKey, "2026-10-14");
});

test("carga: lê número em vários formatos e formata em português", () => {
  assert.equal(parseLoad("40"), 40);
  assert.equal(parseLoad("42,5 kg"), 42.5);
  assert.equal(parseLoad("20kg cada"), 20);
  assert.equal(parseLoad("peso corporal"), null);
  assert.equal(formatKg(42.5), "42,5 kg");
  assert.equal(formatKg(40), "40 kg");
  assert.equal(exerciseKey("  Supíno   RETO "), "supino reto");
});

function workout(dayKey, name, load, createdAt = `${dayKey}T10:00:00.000Z`) {
  return { id: `${dayKey}-${name}-${load}`, dayKey, name, sets: "3", reps: "10", load, notes: "", createdAt };
}

test("treino: reconhece recorde pessoal e variação sobre o último treino", () => {
  const list = [workout("2026-10-01", "Supino", "40"), workout("2026-10-04", "supino", "42,5"), workout("2026-10-08", "Supino", "40")];
  assert.equal(workoutInsight(list, list[0]).isRecord, false);
  assert.deepEqual(workoutInsight(list, list[1]), { load: 42.5, previousLoad: 40, delta: 2.5, isRecord: true });
  assert.equal(workoutInsight(list, list[2]).isRecord, false);
  assert.equal(workoutInsight(list, list[2]).delta, -2.5);
});

test("treino: estatísticas por exercício e último treino anterior", () => {
  const list = [
    workout("2026-10-01", "Supino", "40"),
    workout("2026-10-04", "Supino", "45"),
    workout("2026-10-04", "Agachamento", "60"),
    workout("2026-10-05", "Rosca", "peso corporal")
  ];
  const stats = exerciseStats(list);
  const supino = stats.find((item) => item.key === "supino");
  assert.deepEqual(supino.points, [40, 45]);
  assert.equal(supino.best, 45);
  assert.equal(supino.delta, 5);
  assert.equal(stats.find((item) => item.key === "rosca").best, null);
  assert.equal(lastSessionBefore(list, "2026-10-05"), "2026-10-04");
  assert.equal(lastSessionBefore(list, "2026-10-01"), null);
});

test("tarefas em aberto de ontem podem ser trazidas, sem duplicar", () => {
  const state = createInitialState();
  state.tasks.push(task("2026-10-13", false, "Ler"), task("2026-10-13", true, "Treinar"), task("2026-10-13", false, "Estudar"));
  state.tasks.push(task("2026-10-14", false, "estudar"));
  assert.deepEqual(carryOverCandidates(state, "2026-10-13", "2026-10-14").map((item) => item.title), ["Ler"]);
});

test("backup: exporta, valida e explica o problema", () => {
  const state = createInitialState();
  state.tasks.push(task("2026-10-10", false, "Ler"));
  const backup = exportState(state);
  assert.equal(validateBackup(backup), true);
  assert.equal(backup.summary.tasks, 1);

  assert.ok(backupProblem(null));
  assert.ok(backupProblem({ schemaVersion: 1, data: {} }));
  assert.match(backupProblem({ schemaVersion: SCHEMA_VERSION + 1, data: { tasks: [] } }), /mais nova/);
});

test("normalizeState: migra a versão 1 convertendo os hábitos em alertas", () => {
  const v1 = {
    schemaVersion: 1,
    settings: { name: "Magno", waterGoalMl: 3000, theme: "dark-red" },
    tasks: [{ id: "t1", title: "Treinar", dayKey: "2026-10-10", completed: true, createdAt: "2026-10-10T10:00:00.000Z", completedAt: null }],
    daily: { "2026-10-10": { waterMl: 1500, resistedSugar: true, resistedFastFood: true, victorious: true } },
    quotes: [{ id: "x", text: "antiga" }],
    quoteHistory: { "2026-10-10": "x" },
    workouts: [],
    notes: [],
    ui: { ouroborosSeenFor: ["2026-10-09"] }
  };

  const state = normalizeState(v1);
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.settings.name, "Magno");
  assert.equal(state.settings.waterGoalMl, 3000);
  assert.equal(state.alerts.length, 3);
  assert.deepEqual(state.daily["2026-10-10"].alertsDone, { "alert-acucar": true, "alert-fastfood": true });
  assert.equal(state.daily["2026-10-10"].waterMl, 1500);
  assert.equal(state.daily["2026-10-10"].victorious, true);
  assert.deepEqual(state.ui.ouroborosSeenFor, ["2026-10-09"]);
  assert.equal("quotes" in state, false);
  assert.equal("quoteHistory" in state, false);
});

test("normalizeState: descarta lixo, limita tamanhos e recalcula a vitória", () => {
  const dirty = {
    settings: { name: "x".repeat(500), waterGoalMl: "abc" },
    tasks: [
      { id: "ok", title: "Boa", dayKey: "2026-10-10", completed: true },
      { id: "sem-dia", title: "Ruim", dayKey: "ontem", completed: false },
      { title: "", dayKey: "2026-10-10" },
      "texto solto",
      null
    ],
    daily: { "2026-10-10": { victorious: true, waterMl: -50 }, "lixo": { waterMl: 5 }, "2026-10-11": { victorious: true } },
    alerts: [{ id: "a", label: "Meu alerta" }, { id: "a", label: "Duplicado" }, { label: "" }],
    workouts: [{ name: "Supino", dayKey: "2026-10-10", sets: 3, reps: 10, load: 40 }, { name: "", dayKey: "2026-10-10" }],
    notes: [{ title: "Nota", content: "linha1\r\nlinha2", tags: ["a", "a", "", "b"] }, { title: "" }],
    ui: { ouroborosSeenFor: ["2026-10-09", "não é dia", 5] }
  };

  const state = normalizeState(dirty);
  assert.equal(state.settings.name.length, LIMITS.name);
  assert.equal(state.settings.waterGoalMl, 2500);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.daily["2026-10-10"].waterMl, 0);
  assert.equal(state.daily.lixo, undefined);
  assert.equal(state.daily["2026-10-11"].victorious, undefined, "vitória sem tarefas não é aceita");
  assert.deepEqual(state.alerts, [{ id: "a", label: "Meu alerta" }]);
  assert.equal(state.workouts.length, 1);
  assert.equal(state.workouts[0].load, "40");
  assert.equal(state.notes.length, 1);
  assert.equal(state.notes[0].content, "linha1\nlinha2");
  assert.deepEqual(state.notes[0].tags, ["a", "b"]);
  assert.deepEqual(state.ui.ouroborosSeenFor, ["2026-10-09"]);
});

test("normalizeState: entrada inválida vira estado inicial e alertas vazios são respeitados", () => {
  for (const input of [null, undefined, "texto", 42, [], {}]) {
    const state = normalizeState(input);
    assert.equal(state.schemaVersion, SCHEMA_VERSION);
    assert.equal(state.tasks.length, 0);
  }
  assert.equal(normalizeState({ alerts: [] }).alerts.length, 0, "quem removeu todos os alertas não os recebe de volta");
  assert.equal(normalizeState({}).alerts.length, DEFAULT_ALERTS.length);
});

test("normalizeState: é idempotente", () => {
  const state = createInitialState();
  winDay(state, "2026-10-10");
  addWater(state, "2026-10-10", 750);
  const once = normalizeState(JSON.parse(JSON.stringify(state)));
  const twice = normalizeState(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
});

test("parseTags: tira espaços e #, remove repetidas e respeita os limites", () => {
  assert.deepEqual(parseTags("estudo, #foco ,estudo"), ["estudo", "foco"]);
  assert.deepEqual(parseTags("  ##duplo ,, , leitura "), ["duplo", "leitura"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
  assert.equal(parseTags("a".repeat(100))[0].length, LIMITS.noteTag);
  assert.equal(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(",")).length, LIMITS.noteTags);
});
