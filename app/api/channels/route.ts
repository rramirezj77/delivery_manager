import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import fs from 'fs';
import path from 'path';
import { Channel } from '../../types/channel';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries
const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'channels.json');
const CACHE_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

interface ChannelCache {
  channels: Channel[];
  lastUpdated: number;
}

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize or load the cache file
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ channels: [], lastUpdated: 0 }));
}

async function fetchChannelsFromSlack(): Promise<any[]> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('SLACK_BOT_TOKEN is not set in environment variables');
    throw new Error('SLACK_BOT_TOKEN is not set');
  }

  // Validate token format
  if (!token.startsWith('xoxb-')) {
    console.error('Invalid token format. Bot tokens should start with xoxb-');
    throw new Error('Invalid token format');
  }

  console.log('Token validation:', {
    hasToken: !!token,
    tokenLength: token.length,
    tokenStart: token.substring(0, 10),
    tokenEnd: token.substring(token.length - 4),
    tokenFormat: token.startsWith('xoxb-') ? 'valid' : 'invalid',
    envVars: Object.keys(process.env).filter(key => key.includes('SLACK'))
  });

  const slack = new WebClient(token);
  let retryCount = 0;
  let allChannels: any[] = [];
  let cursor: string | undefined;

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempting to fetch channels (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // First try to fetch public channels
      do {
        const result = await slack.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 1000,
          cursor: cursor
        });

        if (!result.ok) {
          console.error('Channels API error:', {
            error: result.error,
            response: result
          });
          throw new Error(`Failed to fetch channels: ${result.error}`);
        }

        const channels = result.channels || [];
        allChannels = [...allChannels, ...channels];
        cursor = result.response_metadata?.next_cursor;

        console.log('Fetched channels batch:', {
          batchSize: channels.length,
          hasMore: !!cursor,
          memberChannels: channels.filter(c => c.is_member).length
        });

      } while (cursor);

      console.log('Successfully fetched all channels:', {
        total: allChannels.length,
        private: allChannels.filter(c => c.is_private).length,
        public: allChannels.filter(c => !c.is_private).length,
        botMemberChannels: allChannels.filter(c => c.is_member).length,
        membershipDetails: allChannels
          .filter(c => c.is_member)
          .map(c => ({
            name: c.name,
            isPrivate: c.is_private,
            isMember: c.is_member
          }))
      });

      return allChannels;
    } catch (error: any) {
      console.error(`Error fetching channels (attempt ${retryCount + 1}/${MAX_RETRIES}):`, {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.data
      });
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  throw new Error('Failed to fetch channels after all retries');
}

async function updateChannelsCache() {
  try {
    console.log('Starting channels cache update...');
    const channels = await fetchChannelsFromSlack();
    
    // Transform channels before caching
    const transformedChannels = channels.map(transformChannelData);
    
    const cache: ChannelCache = {
      channels: transformedChannels,
      lastUpdated: Date.now()
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('Channels cache updated successfully');
  } catch (error) {
    console.error('Failed to update channels cache:', error);
    throw error;
  }
}

async function getChannelsFromCache(): Promise<any[]> {
  const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
  const cache: ChannelCache = JSON.parse(cacheContent);
  return cache.channels;
}

function transformChannelData(channel: any) {
  return {
    id: channel.id,
    name: channel.name,
    topic: channel.topic,
    purpose: channel.purpose,
    memberCount: channel.num_members,
    isPrivate: channel.is_private,
    isMember: channel.is_member
  };
}

export async function GET(request: Request) {
  try {
    console.log('Received channels API request');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const forceRefresh = searchParams.get('refresh') === 'true';
    const showMembership = searchParams.get('membership') === 'true';

    let channels;
    
    if (forceRefresh) {
      console.log('Forced refresh requested, fetching fresh channels...');
      channels = await fetchChannelsFromSlack();
      
      // Transform channels before caching
      const transformedChannels = channels.map(transformChannelData);
      
      // Update cache with transformed data
      const cache: ChannelCache = {
        channels: transformedChannels,
        lastUpdated: Date.now()
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log('Cache updated with fresh channels');
      
      channels = transformedChannels;
    } else {
      // Check if we need to update the cache
      const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cache: ChannelCache = JSON.parse(cacheContent);
      const timeSinceLastUpdate = Date.now() - cache.lastUpdated;

      // If it's been more than an hour since the last update, update in the background
      if (timeSinceLastUpdate > CACHE_UPDATE_INTERVAL) {
        console.log('Cache is old, updating in background...');
        updateChannelsCache().catch(console.error);
      }

      // Get channels from cache (already transformed)
      channels = await getChannelsFromCache();
    }

    // Sort channels: bot member channels first, then alphabetically by name
    channels.sort((a, b) => {
      // First sort by bot membership
      if (a.isMember && !b.isMember) return -1;
      if (!a.isMember && b.isMember) return 1;
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Filter channels based on the search query if one is provided
    if (query) {
      channels = channels.filter(channel => 
        channel.name.toLowerCase().includes(query)
      );
    }

    // If membership info is requested, show detailed information
    if (showMembership) {
      const memberChannels = channels.filter(c => c.isMember);
      console.log('Bot membership details:', {
        totalChannels: channels.length,
        memberChannels: memberChannels.length,
        memberChannelDetails: memberChannels.map(c => ({
          name: c.name,
          isPrivate: c.isPrivate,
          memberCount: c.memberCount,
          created: c.created
        }))
      });
    }

    console.log('Returning channels:', {
      total: channels.length,
      private: channels.filter(c => c.isPrivate).length,
      public: channels.filter(c => !c.isPrivate).length,
      query: query || 'none',
      forceRefresh,
      botMemberChannels: channels.filter(c => c.isMember).length
    });

    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('Error in channels API:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
} 