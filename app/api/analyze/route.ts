import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function POST(request: Request) {
  try {
    const { channelName } = await request.json();
    console.log('Analyzing channel:', channelName);

    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Slack configuration is missing' },
        { status: 500 }
      );
    }

    const slack = new WebClient(slackToken);

    // Verify bot installation and permissions
    console.log('Verifying bot installation...');
    console.log('Client ID:', process.env.SLACK_CLIENT_ID);
    console.log('Bot Token:', process.env.SLACK_BOT_TOKEN?.substring(0, 10) + '...');
    
    try {
      const botInfo = await slack.bots.info();
      console.log('Bot info:', {
        id: botInfo.bot?.id,
        name: botInfo.bot?.name,
        scopes: botInfo.bot?.scopes,
        isAppUser: botInfo.bot?.is_app_user
      });

      if (!botInfo.bot?.is_app_user) {
        console.error('Bot is not properly installed as an app user');
        const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=channels:read,channels:history,groups:read,groups:history,channels:join,groups:write&user_scope=`;
        console.log('Install URL:', installUrl);
        
        return NextResponse.json(
          {
            error: 'Bot installation incomplete',
            details: {
              message: 'The bot needs to be properly installed in your workspace',
              steps: [
                '1. Go to your Slack workspace settings',
                '2. Click on "Apps" in the left sidebar',
                '3. Find "delivery_manager" in the list',
                '4. Click "Configure"',
                '5. Make sure all required permissions are granted:',
                '   - channels:read',
                '   - channels:history',
                '   - groups:read',
                '   - groups:history',
                '   - channels:join',
                '   - groups:write',
                '6. Click "Reinstall to Workspace"',
                '7. After reinstalling, try analyzing again'
              ],
              installUrl
            }
          },
          { status: 403 }
        );
      }

      // Verify required scopes
      const requiredScopes = [
        'channels:read',
        'channels:history',
        'groups:read',
        'groups:history',
        'channels:join',
        'groups:write'
      ];
      const missingScopes = requiredScopes.filter(scope => !botInfo.bot?.scopes?.includes(scope));
      
      if (missingScopes.length > 0) {
        console.error('Missing required scopes:', missingScopes);
        return NextResponse.json(
          {
            error: 'Missing required permissions',
            details: {
              message: 'The bot is missing required permissions',
              missingScopes,
              currentScopes: botInfo.bot?.scopes || [],
              steps: [
                '1. Go to your Slack workspace settings',
                '2. Click on "Apps" in the left sidebar',
                '3. Find "delivery_manager" in the list',
                '4. Click "Configure"',
                '5. Add the following permissions:',
                ...missingScopes.map(scope => `   - ${scope}`),
                '6. Click "Reinstall to Workspace"',
                '7. After reinstalling, try analyzing again'
              ],
              installUrl: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${missingScopes.join(',')}&user_scope=`
            }
          },
          { status: 403 }
        );
      }
    } catch (error: any) {
      console.error('Error verifying bot installation:', error);
      return NextResponse.json(
        {
          error: 'Bot verification failed',
          details: {
            message: error.message || 'Failed to verify bot installation',
            steps: [
              '1. Check if the bot is installed in your workspace',
              '2. Verify the SLACK_BOT_TOKEN is correct',
              '3. Try reinstalling the bot if needed'
            ]
          }
        },
        { status: 403 }
      );
    }

    // First verify the channel exists and bot is a member
    console.log('Verifying channel access...');
    const channelsResult = await slack.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel'
    });

    if (!channelsResult.ok) {
      console.error('Failed to list channels:', channelsResult.error);
      return NextResponse.json(
        { error: 'Failed to list channels', details: channelsResult.error },
        { status: 500 }
      );
    }

    // Find the channel by name
    const channel = channelsResult.channels?.find(
      ch => ch.name === channelName
    );

    if (!channel) {
      console.error('Channel not found:', {
        searchedName: channelName,
        availableChannels: channelsResult.channels?.map(ch => ({
          name: ch.name,
          id: ch.id,
          is_member: ch.is_member
        }))
      });
      return NextResponse.json(
        { 
          error: 'Channel not found',
          details: {
            searchedName: channelName,
            availableChannels: channelsResult.channels?.map(ch => ({
              name: ch.name,
              isMember: ch.is_member
            }))
          }
        },
        { status: 404 }
      );
    }

    // Verify bot is a member
    if (!channel.is_member) {
      console.error('Bot is not a member of the channel:', {
        channelName,
        channelId: channel.id
      });
      return NextResponse.json(
        { 
          error: 'Bot is not a member of this channel',
          details: {
            channelName,
            channelId: channel.id,
            steps: [
              '1. Open the channel in Slack',
              '2. Click the channel name at the top',
              '3. Click "Integrations" tab',
              '4. Click "Add apps"',
              '5. Search for "delivery_manager"',
              '6. Click "Add"',
              '7. Try analyzing again'
            ]
          }
        },
        { status: 403 }
      );
    }

    console.log('Channel found and bot is a member:', {
      channelName,
      channelId: channel.id,
      isPrivate: channel.is_private
    });

    // Fetch messages from the channel
    console.log('Fetching channel messages...');
    const historyResult = await slack.conversations.history({
      channel: channel.id,
      limit: 100 // Adjust this number based on your needs
    });

    if (!historyResult.ok) {
      console.error('Failed to fetch channel history:', historyResult.error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch channel messages',
          details: {
            error: historyResult.error,
            channelName,
            channelId: channel.id
          }
        },
        { status: 500 }
      );
    }

    // For now, return mock data
    return NextResponse.json({
      health: {
        score: 85,
        metrics: {
          responseTime: 4.2,
          resolutionTime: 24,
          satisfaction: 4.5
        }
      },
      risks: [
        {
          type: 'communication',
          severity: 'medium',
          description: 'Some delays in response times during peak hours'
        }
      ],
      debug: {
        channel: {
          name: channel.name,
          id: channel.id,
          isPrivate: channel.is_private,
          memberCount: channel.num_members
        },
        messageCount: historyResult.messages?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: {
          error: error.message,
          code: error.code,
          data: error.data
        }
      },
      { status: 500 }
    );
  }
} 