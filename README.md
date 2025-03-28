# Delivery Manager Dashboard

A proof of concept dashboard that analyzes Slack conversations to generate client health reports. The application provides insights into project health, client satisfaction, team performance, and identifies potential risks and action items.

## Features

- Client health dashboard with key metrics
- Slack conversation analysis
- Sentiment analysis for client and team satisfaction
- Risk identification and tracking
- Action items and commitment tracking
- Project scope monitoring

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your Slack API credentials:
```
SLACK_BOT_TOKEN=your-slack-bot-token
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Required Slack Bot Permissions

The Slack bot requires the following permissions:
- channels:history
- groups:history
- im:history
- mpim:history
- channels:read
- groups:read
- channels:join
- groups:write
- channels:write

## How it Works

The dashboard analyzes Slack conversations using natural language processing to:
- Track sentiment over time
- Identify potential risks and issues
- Monitor project scope changes
- Track commitments and action items
- Measure team and client satisfaction

## Note

This is a proof of concept application. Please ensure you have appropriate permissions and comply with your organization's policies regarding Slack data analysis. 