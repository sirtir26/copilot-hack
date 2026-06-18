import dotenv from "dotenv";

dotenv.config();

function parseRoomMappings(rawValue) {
  if (!rawValue || !rawValue.trim()) {
    return new Map();
  }

  return new Map(
    rawValue
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [roomId, issueKey] = entry.split(":").map((part) => part.trim());
        return [roomId, issueKey];
      })
      .filter(([roomId, issueKey]) => roomId && issueKey)
  );
}

export const config = {
  port: Number(process.env.PORT || 3000),
  webexToken: process.env.WEBEX_BOT_TOKEN || "",
  webexBotEmail: (process.env.WEBEX_BOT_EMAIL || "").toLowerCase(),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  jiraBaseUrl: (process.env.JIRA_BASE_URL || "").replace(/\/$/, ""),
  jiraEmail: process.env.JIRA_EMAIL || "",
  jiraApiToken: process.env.JIRA_API_TOKEN || "",
  roomJiraMappings: parseRoomMappings(process.env.ROOM_JIRA_MAPPINGS || ""),
  dailyCron: process.env.DAILY_CRON || "0 18 * * *"
};

export function requireCoreConfig() {
  const missing = [];
  if (!config.webexToken) missing.push("WEBEX_BOT_TOKEN");
  if (!config.webexBotEmail) missing.push("WEBEX_BOT_EMAIL");
  if (!config.jiraBaseUrl) missing.push("JIRA_BASE_URL");
  if (!config.jiraEmail) missing.push("JIRA_EMAIL");
  if (!config.jiraApiToken) missing.push("JIRA_API_TOKEN");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
