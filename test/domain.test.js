import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  bestStreak,
  calculateStreak,
  createInitialState,
  exportState,
  isVictoriousDay,
  monthGrid,
  selectQuoteForDay,
  shouldShowOuroboros,
  todayKey,
  upsertDailyFromTasks,
  validateBackup
} from "../src/domain.js";
import { initialQuotes } from "../src/quotes.js";

test("todayKey uses local yyyy-mm-dd format", () => {
  assert.equal(todayKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("addDays handles month and year transitions", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("a victorious day needs at least one completed task", () => {
  assert.equal(isVictoriousDay([]), false);
  assert.equal(isVictoriousDay([{ completed: true }]), true);
  assert.equal(isVictoriousDay([{ completed: true }, { completed: false }]), false);
});

test("streak counts consecutive victory days backwards from reference", () => {
  assert.equal(calculateStreak(["2026-10-08", "2026-10-09", "2026-10-10"], "2026-10-10"), 3);
  assert.equal(calculateStreak(["2026-10-08", "2026-10-10"], "2026-10-10"), 1);
});

test("bestStreak finds the longest victory sequence", () => {
  assert.equal(bestStreak(["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"]), 3);
});

test("daily summary is updated from tasks without automatic empty victory", () => {
  const state = createInitialState(initialQuotes);
  upsertDailyFromTasks(state, "2026-10-10");
  assert.equal(state.daily["2026-10-10"].victorious, false);

  state.tasks.push({ id: "1", title: "Treinar", dayKey: "2026-10-10", completed: true, createdAt: "a" });
  upsertDailyFromTasks(state, "2026-10-10");
  assert.equal(state.daily["2026-10-10"].victorious, true);
});

test("ouroboros appears after a broken previous streak once", () => {
  const state = createInitialState(initialQuotes);
  state.daily["2026-10-08"] = { victorious: true };
  state.daily["2026-10-09"] = { victorious: false };
  assert.equal(shouldShowOuroboros(state, "2026-10-10"), true);
  state.ui.ouroborosSeenFor.push("2026-10-09");
  assert.equal(shouldShowOuroboros(state, "2026-10-10"), false);
});

test("quote selection avoids recent repetitions when possible", () => {
  const history = {
    "2026-10-09": initialQuotes[0].id,
    "2026-10-08": initialQuotes[1].id
  };
  const quote = selectQuoteForDay(initialQuotes, history, "2026-10-10");
  assert.notEqual(quote.id, initialQuotes[0].id);
  assert.notEqual(quote.id, initialQuotes[1].id);
});

test("month grid always returns six weeks", () => {
  assert.equal(monthGrid(2026, 9).length, 42);
});

test("backup export and validation keep schema and data", () => {
  const state = createInitialState(initialQuotes);
  state.tasks.push({ id: "1", title: "Ler", dayKey: "2026-10-10", completed: false, createdAt: "a" });
  const backup = exportState(state);
  assert.equal(validateBackup(backup), true);
  assert.equal(backup.summary.tasks, 1);
});
