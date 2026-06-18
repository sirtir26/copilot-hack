import cron from "node-cron";
import express from "express";
import { config, requireCoreConfig } from "./config.js";
import { postJiraComment } from "./jira.js";
import { buildJiraComment, summarizeChat } from "./summarize.js";
import { Storage } from "./storage.js";
import { getMessageById, sendRoomMessage } from "./webex.js";

const app = express();
const store = new Storage();

app.use(express.json());

function getWindowStartIso(lastPostedAt) {
  if (lastPostedAt) return lastPostedAt;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

async function runRoomUpdate(roomId, issueKeyOverride) {
  const room = await store.getRoom(roomId);
  const issueKey = issueKeyOverride || config.roomJiraMappings.get(roomId) || room.jiraIssueKey;
  if (!issueKey) {
    throw new Error(`No JIRA issue mapped for room: ${roomId}`);
  }

  const startIso = getWindowStartIso(room.lastPostedAt);
  const messages = room.messages.filter((message) => Date.parse(message.created) > Date.parse(startIso));
  const periodLabel = `${startIso} -> ${new Date().toISOString()}`;

  const summary = await summarizeChat(messages, {
    apiKey: config.openAiApiKey,
    model: config.openAiModel
  });
  const comment = buildJiraComment({ ...summary, periodLabel });

  await postJiraComment({
    baseUrl: config.jiraBaseUrl,
    email: config.jiraEmail,
    apiToken: config.jiraApiToken,
    issueKey,
    body: comment
  });

  await store.setRoom(roomId, { lastPostedAt: new Date().toISOString(), jiraIssueKey: issueKey });
  return {
    roomId,
    issueKey,
    messageCount: messages.length,
    summaryBullets: summary.summaryBullets.length,
    actionItems: summary.actionItems.length
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/webex/webhook", async (req, res) => {
  try {
    const messageId = req.body?.data?.id;
    if (!messageId) {
      res.status(400).json({ error: "Missing webhook message id." });
      return;
    }

    const message = await getMessageById(config.webexToken, messageId);
    if (message.personEmail?.toLowerCase() === config.webexBotEmail) {
      res.status(200).json({ ignored: "bot-message" });
      return;
    }

    const text = (message.text || "").trim();
    if (!text) {
      res.status(200).json({ ignored: "empty" });
      return;
    }

    if (/^\/daily-update\b/i.test(text)) {
      const result = await runRoomUpdate(message.roomId);
      await sendRoomMessage(
        config.webexToken,
        message.roomId,
        `Posted daily summary to JIRA ${result.issueKey}. Summary bullets: ${result.summaryBullets}, action items: ${result.actionItems}.`
      );
      res.status(200).json({ ok: true, triggeredBy: "command", result });
      return;
    }

    await store.appendMessage(message.roomId, {
      id: message.id,
      personEmail: message.personEmail,
      text,
      created: message.created || new Date().toISOString()
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/trigger/daily", async (req, res) => {
  try {
    const roomId = req.body?.roomId;
    const jiraIssueKey = req.body?.jiraIssueKey;

    if (roomId) {
      const result = await runRoomUpdate(roomId, jiraIssueKey);
      res.status(200).json({ ok: true, results: [result] });
      return;
    }

    const roomIds = [...new Set([...config.roomJiraMappings.keys(), ...(await store.getRoomIds())])];
    const results = [];

    for (const id of roomIds) {
      try {
        const result = await runRoomUpdate(id);
        results.push({ ...result, status: "posted" });
      } catch (error) {
        results.push({ roomId: id, status: "failed", error: error.message });
      }
    }

    res.status(200).json({ ok: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function scheduleDailyRuns() {
  cron.schedule(config.dailyCron, async () => {
    const roomIds = [...config.roomJiraMappings.keys()];
    for (const roomId of roomIds) {
      try {
        const result = await runRoomUpdate(roomId);
        console.log(`[daily-run] Posted ${result.issueKey} for room ${roomId}`);
      } catch (error) {
        console.error(`[daily-run] Failed room ${roomId}: ${error.message}`);
      }
    }
  });
}

function bootstrap() {
  requireCoreConfig();
  scheduleDailyRuns();
  app.listen(config.port, () => {
    console.log(`Webex JIRA AI bot running on port ${config.port}`);
  });
}

bootstrap();
