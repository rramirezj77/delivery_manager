import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

async function verifySlackConfiguration(slack: WebClient) {
  const diagnostics = {
    token: {
      configured: !!process.env.SLACK_BOT_TOKEN,
      format: process.env.SLACK_BOT_TOKEN?.startsWith('xoxb-'),
      length: process.env.SLACK_BOT_TOKEN?.length
    },
    clientId: {
      configured: !!process.env.SLACK_CLIENT_ID,
      format: process.env.SLACK_CLIENT_ID?.match(/^\d+\.\d+$/)
    },
    auth: null as any,
    bot: null as any,
    team: null as any,
    channels: null as any,
    apiCalls: [] as any[]
  };

  try {
    // Test authentication
    console.log('Testing Slack authentication...');
    const authTest = await slack.auth.test();
    diagnostics.apiCalls.push({
      method: 'auth.test',
      ok: authTest.ok,
      error: authTest.error
    });
    
    diagnostics.auth = {
      ok: authTest.ok,
      team: authTest.team,
      user: authTest.user,
      team_id: authTest.team_id,
      user_id: authTest.user_id,
      bot_id: authTest.bot_id
    };

    if (!authTest.ok) {
      throw new Error(`Auth test failed: ${authTest.error}`);
    }

    // Get bot info
    console.log('Getting bot information...');
    const botInfo = await slack.bots.info({ bot: authTest.bot_id });
    diagnostics.apiCalls.push({
      method: 'bots.info',
      ok: botInfo.ok,
      error: botInfo.error
    });
    
    diagnostics.bot = {
      ok: botInfo.ok,
      id: botInfo.bot?.id,
      name: botInfo.bot?.name,
      scopes: botInfo.bot?.scopes,
      is_app_user: botInfo.bot?.is_app_user,
      deleted: botInfo.bot?.deleted
    };

    if (!botInfo.ok) {
      throw new Error(`Failed to get bot info: ${botInfo.error}`);
    }

    // Test channel access with a simpler call first
    console.log('Testing basic channel access...');
    const basicChannelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel',
      limit: 1
    });
    
    diagnostics.apiCalls.push({
      method: 'conversations.list (basic)',
      ok: basicChannelsResult.ok,
      error: basicChannelsResult.error,
      warning: basicChannelsResult.warning
    });

    if (!basicChannelsResult.ok) {
      throw new Error(`Failed to list basic channels: ${basicChannelsResult.error}`);
    }

    // Test private channel access
    console.log('Testing private channel access...');
    const privateChannelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'private_channel',
      limit: 1
    });
    
    diagnostics.apiCalls.push({
      method: 'conversations.list (private)',
      ok: privateChannelsResult.ok,
      error: privateChannelsResult.error,
      warning: privateChannelsResult.warning
    });

    if (!privateChannelsResult.ok) {
      throw new Error(`Failed to list private channels: ${privateChannelsResult.error}`);
    }

    // Test channel history access
    console.log('Testing channel history access...');
    if (basicChannelsResult.channels?.[0]) {
      try {
        const historyResult = await slack.conversations.history({
          channel: basicChannelsResult.channels[0].id,
          limit: 1
        });
        
        diagnostics.apiCalls.push({
          method: 'conversations.history',
          ok: historyResult.ok,
          error: historyResult.error,
          warning: historyResult.warning
        });

        if (!historyResult.ok) {
          console.warn('Channel history access failed:', historyResult.error);
          // Don't throw error, just log warning
        }
      } catch (error: any) {
        console.warn('Channel history access failed:', error.message);
        // Don't throw error, just log warning
      }
    }

    // If we got this far, the basic configuration is working
    return { success: true, diagnostics };
  } catch (error: any) {
    console.error('Slack configuration verification failed:', error);
    return {
      success: false,
      error: error.message,
      diagnostics
    };
  }
}

export async function GET(request: Request) {
  try {
    console.log('Searching channels with query:', request.url);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    console.log('Initializing Slack client...');
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Verify configuration
    const verification = await verifySlackConfiguration(slack);
    if (!verification.success) {
      console.error('Slack configuration verification failed:', verification);
      return NextResponse.json({
        error: verification.error,
        details: {
          diagnostics: verification.diagnostics
        }
      }, { status: 500 });
    }

    // List all channels with pagination
    console.log('Fetching channels...');
    let allChannels: any[] = [];
    let cursor: string | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    do {
      try {
        const result = await slack.conversations.list({
          exclude_archived: true,
          types: 'public_channel,private_channel',
          limit: 1000,
          cursor: cursor
        });

        if (!result.ok) {
          throw new Error(`Failed to list channels: ${result.error}`);
        }

        if (result.channels) {
          allChannels = allChannels.concat(result.channels);
        }

        cursor = result.response_metadata?.next_cursor;
        if (cursor) {
          console.log(`Fetching next page of channels with cursor: ${cursor}`);
        }

        // Reset retry count on successful request
        retryCount = 0;
      } catch (error: any) {
        if (error.message?.includes('rate limit') && retryCount < maxRetries) {
          console.log(`Rate limited, waiting 30 seconds before retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          retryCount++;
          continue;
        }
        throw error;
      }
    } while (cursor);

    const totalChannels = allChannels.length;
    console.log(`Retrieved ${totalChannels} total channels`);

    // Filter channels based on query
    const channels = allChannels
      .filter(channel => {
        if (!query) return true;
        const searchTerm = query.toLowerCase();
        return (
          channel.name?.toLowerCase().includes(searchTerm) ||
          channel.topic?.value?.toLowerCase().includes(searchTerm) ||
          channel.purpose?.value?.toLowerCase().includes(searchTerm)
        );
      })
      .map(channel => ({
        id: channel.id,
        name: channel.name || '',
        topic: channel.topic?.value || '',
        purpose: channel.purpose?.value || '',
        memberCount: channel.num_members || 0,
        isPrivate: channel.is_private || false,
        isMember: channel.is_member || false
      }));

    return NextResponse.json({
      channels,
      debug: {
        totalChannels,
        accessibleChannels: channels.length,
        query,
        pagination: {
          pages: Math.ceil(totalChannels / 1000),
          lastCursor: cursor
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({
      error: error.message,
      details: {
        diagnostics: {
          error: error.message,
          code: error.code,
          data: error.data
        }
      }
    }, { status: 500 });
  }
} 