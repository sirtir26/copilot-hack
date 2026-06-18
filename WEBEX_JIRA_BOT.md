# Webex AI Assistant Bot for Daily JIRA Updates

This bot listens to Webex messages, summarizes chat updates into bullet points, extracts action items, and posts a daily update comment to mapped JIRA issues.

## Features

1. Collects messages from Webex spaces via webhook.
2. Generates concise bullet summaries and action items (AI-powered when `OPENAI_API_KEY` is configured).
3. Posts updates to JIRA issue comments.
4. Supports:
   1. Scheduled daily runs (`DAILY_CRON`).
   2. Manual trigger API (`POST /trigger/daily`).
   3. In-chat command trigger (`/daily-update`).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Fill required values in `.env`:
   - `WEBEX_BOT_TOKEN`
   - `WEBEX_BOT_EMAIL`
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `ROOM_JIRA_MAPPINGS` (example: `room-id-1:PROJ-101`)
4. Start the service:
   ```bash
   npm start
   ```

## Webex webhook

Create a Webex webhook for message creation events to:

```
POST https://<your-host>/webex/webhook
```

## Triggering daily updates

### Scheduled (automatic)

The bot runs using `DAILY_CRON` and posts one update per mapped room.

### Manual API trigger

Trigger one room:

```bash
curl -X POST http://localhost:3000/trigger/daily \
  -H "Content-Type: application/json" \
  -d '{"roomId":"<webex-room-id>","jiraIssueKey":"PROJ-101"}'
```

Trigger all mapped rooms:

```bash
curl -X POST http://localhost:3000/trigger/daily \
  -H "Content-Type: application/json" \
  -d '{}'
```

### In-chat trigger

Type this message in the Webex space:

```
/daily-update
```

The bot will summarize the latest period and post it to the mapped JIRA issue.
