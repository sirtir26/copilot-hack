import test from "node:test";
import assert from "node:assert/strict";
import { buildJiraComment } from "./summarize.js";

test("buildJiraComment renders summary and action items", () => {
  const output = buildJiraComment({
    summaryBullets: ["Completed API integration", "Validated migration plan"],
    actionItems: ["Assign owner for rollout"],
    periodLabel: "2026-06-18"
  });

  assert.match(output, /Summary:/);
  assert.match(output, /\* Completed API integration/);
  assert.match(output, /Action items:/);
  assert.match(output, /\* Assign owner for rollout/);
});
