# Midas Slack Bot

A Slack bot that listens to the `midas-pod` channel and automatically creates Azure DevOps work items for support queries.

## Features

- **Automatic work item creation** — triggered when a message mentions the bot in the channel
- **AI-generated titles** — uses AWS Bedrock (Amazon Nova Micro) to generate concise ticket titles from the message content
- **Reaction-based workflow**:
  - React with `👀` to assign the ticket to yourself
  - React with `✅` to close the ticket without leaving Slack
- **Smart query classification** — categorises messages as urgent, priority, Xero restart, or general
- **Sprint assignment** — automatically assigns tickets to the current active sprint, or backlog if none is found

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Slack**: [@slack/bolt](https://github.com/slackapi/bolt-js) with Socket Mode
- **Azure DevOps**: [azure-devops-node-api](https://github.com/microsoft/azure-devops-node-api)
- **AI**: AWS Bedrock (Amazon Nova Micro)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A Slack app with Socket Mode enabled, subscribed to `message` and `reaction_added` events
- An Azure DevOps organisation and project
- AWS credentials with Bedrock access

### Installation

```bash
bun install
```

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | Yes | Slack bot token (`xoxb-...`) |
| `SLACK_APP_TOKEN` | Yes | Slack app-level token (`xapp-...`) |
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `ADO_ORG` | Yes | ADO organisation name |
| `ADO_PROJECT` | Yes | ADO project name |
| `ADO_TEAM` | Yes | ADO team name |
| `ADO_AREA_PATH` | Yes | Work item area path (e.g. `Project\Team\Area`) |
| `ADO_TASK_TYPE` | Yes | Work item type (e.g. `Platform Support`) |
| `ADO_PARENT_WORK_ITEM` | No | Parent work item ID to link tickets to |
| `AWS_REGION` | No | AWS region for Bedrock (defaults to `eu-west-1`) |

### Running

```bash
bun app.ts
```

### Testing

```bash
bun test
```

## Project Structure

```
├── app.ts               # Entry point — initialises Slack Bolt and registers handlers
├── config.ts            # Environment variable validation and exports
├── handlers/
│   ├── message.ts       # Handles incoming messages, creates ADO work items
│   └── reaction.ts      # Handles emoji reactions to assign/close tickets
└── services/
    ├── ado.ts           # Azure DevOps API wrapper
    ├── bedrock.ts       # AWS Bedrock integration for AI title generation
    └── messageParser.ts # Slack message parsing utilities
```
