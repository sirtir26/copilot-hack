import axios from "axios";

function parseJsonFromModel(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```json\s*([\s\S]*?)```/i);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function fallbackSummarize(messages) {
  const cleaned = messages
    .map((msg) => msg.text.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\s+/g, " "));

  const summaryBullets = [...new Set(cleaned)].slice(0, 8);

  const actionMatcher =
    /\b(action item|todo|follow up|follow-up|owner|need to|will|next step|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow))\b/i;
  const actionItems = cleaned.filter((line) => actionMatcher.test(line)).slice(0, 8);

  return {
    summaryBullets: summaryBullets.length ? summaryBullets : ["No substantial updates found."],
    actionItems
  };
}

export async function summarizeChat(messages, options) {
  if (!messages.length) {
    return {
      summaryBullets: ["No updates found for this period."],
      actionItems: []
    };
  }

  if (!options.apiKey) {
    return fallbackSummarize(messages);
  }

  const prompt = [
    "You are summarizing a team chat for a JIRA update.",
    "Return strict JSON with this shape:",
    '{ "summaryBullets": ["..."], "actionItems": ["..."] }',
    "Rules:",
    "1) summaryBullets must be concise and specific.",
    "2) actionItems should only contain explicit or strongly implied action items.",
    "3) If no action items exist, return an empty array.",
    "4) Keep each bullet under 160 characters."
  ].join("\n");

  const lines = messages
    .map((msg) => `- [${msg.personEmail || "unknown"}] ${msg.text}`)
    .join("\n");

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: options.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Chat lines:\n${lines}` }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const content = response.data?.choices?.[0]?.message?.content || "{}";
  const parsed = parseJsonFromModel(content);
  return {
    summaryBullets: Array.isArray(parsed.summaryBullets) ? parsed.summaryBullets : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : []
  };
}

export function buildJiraComment({ summaryBullets, actionItems, periodLabel }) {
  const summary = summaryBullets.map((line) => `* ${line}`).join("\n") || "* No updates found.";
  const actions =
    actionItems.length > 0
      ? actionItems.map((line) => `* ${line}`).join("\n")
      : "* No explicit action items identified.";

  return [
    `Daily Webex update (${periodLabel})`,
    "",
    "Summary:",
    summary,
    "",
    "Action items:",
    actions
  ].join("\n");
}
