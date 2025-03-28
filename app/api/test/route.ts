import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

interface InstallationInfo {
  installUrl: string;
  requiredScopes: string[];
  status?: 'installed' | 'needs_reinstall' | 'error';
}

interface TestResults {
  success: boolean;
  errors: string[];
  installation: InstallationInfo;
  auth?: any;
  team?: any;
  bot: {
    id?: string;
    name?: string;
    bot?: {
      id?: string;
      name?: string;
    };
  };
  channels: {
    total: number;
    memberOf: number;
  };
}

async function testSlackAPI() {
  const results: TestResults = {
    success: true,
    errors: [],
    installation: {
      installUrl: process.env.SLACK_APP_INSTALL_URL || '',
      requiredScopes: [
        'channels:history',
        'channels:join',
        'channels:read',
        'groups:history',
        'groups:read',
        'chat:write',
        'users:read'
      ]
    },
    bot: {},
    channels: {
      total: 0,
      memberOf: 0
    }
  };

  try {
    console.log('Initializing Slack client...');
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Test 1: Authentication
    console.log('Testing Slack authentication...');
    try {
      results.auth = await slack.auth.test();
      console.log('Auth test successful:', results.auth);
    } catch (error: any) {
      results.errors.push(`Auth test failed: ${error.message}`);
      console.error('Auth test failed:', error);
    }

    // Test 2: Bot Info
    console.log('Getting bot information...');
    try {
      results.bot = await slack.bots.info();
      console.log('Bot info:', results.bot);
      
      // Check if bot is properly installed
      if (!results.bot.bot?.id) {
        results.errors.push('Bot is not properly installed as an app user');
        results.installation.status = 'needs_reinstall';
      } else {
        results.installation.status = 'installed';
      }
    } catch (error: any) {
      results.errors.push(`Bot info failed: ${error.message}`);
      console.error('Bot info failed:', error);
      results.installation.status = 'error';
    }

    // Test 3: Team Info
    console.log('Getting team information...');
    try {
      results.team = await slack.team.info();
      console.log('Team info:', results.team);
    } catch (error: any) {
      results.errors.push(`Team info failed: ${error.message}`);
      console.error('Team info failed:', error);
    }

    // Test 4: Channel Access
    console.log('Testing channel access...');
    try {
      const channelsResponse = await slack.conversations.list({
        limit: 5,
        types: 'public_channel,private_channel'
      });
      
      results.channels = {
        total: channelsResponse.channels?.length || 0,
        memberOf: channelsResponse.channels?.filter(c => c.is_member).length || 0
      };
      
      console.log('Channels test successful:', results.channels);
    } catch (error: any) {
      results.errors.push(`Channels test failed: ${error.message}`);
      console.error('Channels test failed:', error);
    }

  } catch (error: any) {
    results.errors.push(`General API error: ${error.message}`);
    console.error('General API error:', error);
  }

  return results;
}

export async function GET() {
  try {
    const results = await testSlackAPI();
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to run tests', details: error.message },
      { status: 500 }
    );
  }
} 