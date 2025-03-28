import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Gemini
console.log('Initializing Gemini API with key:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(slack: WebClient, operation: () => Promise<any>, retryCount = 0): Promise<any> {
  try {
    return await operation();
  } catch (error: any) {
    if (error.data?.error === 'fatal_error' || error.data?.error === 'rate_limited') {
      if (retryCount < 3) {
        const retryAfter = error.data?.retry_after || 30;
        console.log(`Rate limited, waiting ${retryAfter} seconds before retry ${retryCount + 1}/3...`);
        await sleep(retryAfter * 1000);
        return fetchWithRetry(slack, operation, retryCount + 1);
      }
    }
    throw error;
  }
}

async function resolveUserNames(slack: WebClient, text: string): Promise<string> {
  try {
    // Extract user IDs from the text (format: <@USER_ID>)
    const userIds = text.match(/<@([A-Z0-9]+)>/g) || [];
    
    // Remove the <@ and > characters to get clean user IDs
    const cleanUserIds = userIds.map(id => id.replace(/[<>@]/g, ''));
    
    // Fetch user information for each ID
    const userPromises = cleanUserIds.map(async (userId) => {
      try {
        const userInfo = await slack.users.info({ user: userId });
        return {
          id: userId,
          name: userInfo.user?.real_name || userInfo.user?.name || userId
        };
      } catch (error) {
        console.error(`Error fetching user info for ${userId}:`, error);
        return { id: userId, name: userId };
      }
    });

    const users = await Promise.all(userPromises);
    
    // Replace user IDs with real names in the text
    let resolvedText = text;
    users.forEach(user => {
      resolvedText = resolvedText.replace(new RegExp(`<@${user.id}>`, 'g'), user.name);
    });

    return resolvedText;
  } catch (error) {
    console.error('Error resolving user names:', error);
    return text;
  }
}

async function analyzeMessages(messages: any[], slack: WebClient) {
  const messageTexts = messages.map(msg => msg.text).join('\n');
  
  try {
    console.log('Initializing Gemini model...');
    console.log('API Configuration:', {
      model: 'gemini-2.0-flash',
      messageCount: messages.length,
      totalCharacters: messageTexts.length
    });

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are an expert project assistant AI that helps teams manage project delivery.

Given the following Slack messages, extract the following insights:

1. 🔹 Main Topics Discussed – list the main subjects or themes mentioned.
2. 🛠️ Action Items – list action items with:
   - Description
   - (Optional) Owner (if mentioned)
   - (Optional) Due Date (if mentioned)
3. ⚠️ Risks – list any risks, issues, blockers or concerns, and for each one:
   - Description
   - Severity: Low, Medium, or High (based on context)
   - Suggested Owner: Based on the context, suggest who should own this risk (if not already assigned)
4. 📋 Next Steps – list recommended next steps with:
   - Description
   - Suggested Owner: Based on the context, suggest who should own this next step
   - Priority: Low, Medium, or High

Output the result in this JSON format:

{
  "main_topics": [ "topic 1", "topic 2", ... ],
  "action_items": [
    {
      "description": "",
      "owner": "",
      "due_date": ""
    }
  ],
  "risks": [
    {
      "description": "",
      "severity": "Low | Medium | High",
      "suggested_owner": ""
    }
  ],
  "next_steps": [
    {
      "description": "",
      "suggested_owner": "",
      "priority": "Low | Medium | High"
    }
  ]
}

Messages to analyze:
${messageTexts}`;

    console.log('Generating content with Gemini...');
    console.log('Request details:', {
      promptLength: prompt.length,
      model: 'gemini-2.0-flash',
      timestamp: new Date().toISOString()
    });

    const result = await model.generateContent(prompt);
    
    console.log('Getting response from Gemini...');
    const response = await result.response;
    const text = response.text();
    console.log('Received response:', text);
    
    // Clean up the response by removing markdown code blocks
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    // Parse the JSON response
    const analysis = JSON.parse(cleanText);
    
    // Validate the response structure
    if (!analysis.main_topics || !analysis.action_items || !analysis.risks || !analysis.next_steps) {
      console.error('Invalid response structure:', analysis);
      throw new Error('Invalid analysis response structure');
    }

    // Transform the analysis into the expected format for the frontend
    const resolvedRisks = await Promise.all(analysis.risks.map(async (risk: any, index: number) => {
      const resolvedDescription = await resolveUserNames(slack, risk.description);
      const resolvedOwner = await resolveUserNames(slack, risk.suggested_owner || '');
      return {
        id: index + 1,
        title: resolvedDescription.substring(0, 50) + '...',
        description: resolvedDescription,
        severity: risk.severity.toLowerCase(),
        status: 'open',
        suggestedOwner: resolvedOwner || 'Unassigned',
        owner: resolvedOwner || 'Unassigned'
      };
    }));

    const resolvedActions = await Promise.all([
      ...analysis.action_items.map(async (action: any, index: number) => {
        const resolvedDescription = await resolveUserNames(slack, action.description);
        const resolvedOwner = await resolveUserNames(slack, action.owner || '');
        return {
          id: index + 1,
          title: resolvedDescription.substring(0, 50) + '...',
          description: resolvedDescription,
          priority: 'medium',
          status: 'pending',
          owner: resolvedOwner || 'Unassigned',
          dueDate: action.due_date || 'No due date'
        };
      }),
      ...(analysis.next_steps || []).map(async (step: any, index: number) => {
        const resolvedDescription = await resolveUserNames(slack, step.description);
        const resolvedOwner = await resolveUserNames(slack, step.suggested_owner || '');
        return {
          id: analysis.action_items.length + index + 1,
          title: resolvedDescription.substring(0, 50) + '...',
          description: resolvedDescription,
          priority: step.priority.toLowerCase(),
          status: 'pending',
          owner: resolvedOwner || 'Unassigned',
          dueDate: 'No due date',
          isNextStep: true
        };
      })
    ]);

    return {
      health: {
        overall_health: {
          score: calculateOverallHealth(analysis),
          trend: 'stable',
          details: 'Based on message sentiment, risks, and action items completion rate'
        },
        scope_management: {
          score: calculateScopeScore(analysis),
          trend: 'up',
          details: 'Project scope is well-defined and changes are properly managed'
        },
        client_satisfaction: {
          score: calculateClientSatisfaction(analysis),
          trend: 'up',
          details: 'Positive client interactions and feedback in discussions'
        },
        team_performance: {
          score: calculateTeamPerformance(analysis),
          trend: 'stable',
          details: 'Good team collaboration and task completion rate'
        }
      },
      risks: resolvedRisks,
      actions: resolvedActions,
      main_topics: analysis.main_topics
    };
  } catch (error) {
    console.error('Error analyzing messages:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleKey: !!process.env.GOOGLE_API_KEY,
        model: 'gemini-2.0-flash'
      }
    });

    // Log the full error object for debugging
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Return more specific error information
    return {
      health: {
        overall_health: {
          score: 50,
          trend: 'stable',
          details: 'Unable to analyze overall health'
        },
        scope_management: {
          score: 50,
          trend: 'stable',
          details: 'Unable to analyze scope management'
        },
        client_satisfaction: {
          score: 50,
          trend: 'stable',
          details: 'Unable to analyze client satisfaction'
        },
        team_performance: {
          score: 50,
          trend: 'stable',
          details: 'Unable to analyze team performance'
        }
      },
      risks: [
        {
          description: `Unable to analyze messages: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'high',
          suggested_owner: 'Team'
        }
      ],
      actions: [
        {
          description: 'Retry analysis after fixing the error',
          owner: 'Team',
          due_date: 'ASAP'
        }
      ],
      main_topics: ['Analysis Failed']
    };
  }
}

function calculateOverallHealth(analysis: any): number {
  // Calculate overall health based on various factors
  const riskScore = 100 - (analysis.risks.length * 10); // Deduct points for each risk
  const actionScore = analysis.action_items.length > 0 ? 80 : 60; // Higher score if actions are being tracked
  const topicScore = analysis.main_topics.length > 2 ? 90 : 70; // Higher score for more diverse discussions
  
  return Math.round((riskScore + actionScore + topicScore) / 3);
}

function calculateScopeScore(analysis: any): number {
  // Look for scope-related keywords in topics and risks
  const scopeKeywords = ['scope', 'requirement', 'feature', 'milestone', 'deadline', 'deliverable'];
  const hasScope = analysis.main_topics.some((topic: string) => 
    scopeKeywords.some(keyword => topic.toLowerCase().includes(keyword))
  );
  
  const scopeRisks = analysis.risks.filter((risk: any) => 
    scopeKeywords.some(keyword => risk.description.toLowerCase().includes(keyword))
  );
  
  return hasScope ? (100 - (scopeRisks.length * 15)) : 70;
}

function calculateClientSatisfaction(analysis: any): number {
  // Look for positive/negative sentiment in client interactions
  const positiveKeywords = ['thank', 'great', 'excellent', 'good', 'happy', 'pleased'];
  const negativeKeywords = ['issue', 'problem', 'concern', 'delay', 'bug', 'fix'];
  
  const positiveCount = analysis.main_topics.filter((topic: string) =>
    positiveKeywords.some(keyword => topic.toLowerCase().includes(keyword))
  ).length;
  
  const negativeCount = analysis.risks.filter((risk: any) =>
    negativeKeywords.some(keyword => risk.description.toLowerCase().includes(keyword))
  ).length;
  
  return Math.max(50, Math.min(100, 75 + (positiveCount * 5) - (negativeCount * 10)));
}

function calculateTeamPerformance(analysis: any): number {
  // Calculate based on action items and collaboration indicators
  const completedActions = analysis.action_items.filter((action: any) => 
    action.status === 'completed'
  ).length;
  
  const totalActions = analysis.action_items.length;
  const completionRate = totalActions > 0 ? (completedActions / totalActions) : 0.5;
  
  const baseScore = 70;
  const completionScore = Math.round(completionRate * 30);
  
  return baseScore + completionScore;
}

export async function POST(request: Request) {
  try {
    const { channelName } = await request.json();
    console.log('Analyzing channel:', channelName);

    if (!channelName) {
      return NextResponse.json(
        { 
          error: 'Channel name is required',
          details: 'Please provide a channel name in the request body'
        },
        { status: 400 }
      );
    }

    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Verify bot installation and permissions
    console.log('Verifying bot installation...');
    const authTest = await slack.auth.test();
    console.log('Auth test successful:', authTest);

    // Get bot info
    console.log('Getting bot information...');
    const botInfo = await slack.bots.info();
    console.log('Bot info:', botInfo);

    // List channels to find the target channel
    console.log('Listing channels...');
    let allChannels: any[] = [];
    let nextCursor: string | undefined;

    do {
      const result = await slack.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
        cursor: nextCursor
      });

      if (result.channels) {
        allChannels = allChannels.concat(result.channels);
      }

      nextCursor = result.response_metadata?.next_cursor;
      console.log(`Found channels: ${allChannels.length}`);

      if (nextCursor) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit handling
      }
    } while (nextCursor);

    // Find the target channel
    const channel = allChannels.find(c => c.name === channelName);
    console.log('Target channel:', channel);

    if (!channel) {
      return NextResponse.json(
        {
          error: 'Channel not found',
          details: `Channel '${channelName}' not found in the workspace`,
          availableChannels: allChannels.map(c => c.name)
        },
        { status: 404 }
      );
    }

    // Check if bot is a member of the channel
    if (!channel.is_member) {
      return NextResponse.json(
        {
          error: 'Bot not a member',
          details: `The bot is not a member of the channel '${channelName}'. Please invite the bot to the channel first.`,
          steps: [
            'Open the channel in Slack',
            'Type /invite @deliverymanager',
            'Or click the channel name and select "Integrations"',
            'Click "Add apps" and find "delivery_manager"'
          ],
          channelInfo: {
            name: channel.name,
            isPrivate: channel.is_private,
            memberCount: channel.num_members,
            topic: channel.topic?.value || '',
            purpose: channel.purpose?.value || ''
          }
        },
        { status: 403 }
      );
    }

    // Calculate timestamp for two weeks ago
    const twoWeeksAgo = Math.floor((Date.now() - (14 * 24 * 60 * 60 * 1000)) / 1000);
    console.log('Fetching messages from:', new Date(twoWeeksAgo * 1000).toISOString());

    // Fetch channel messages from the last two weeks
    console.log('Fetching channel messages...');
    const messages = await slack.conversations.history({
      channel: channel.id,
      limit: 100,
      oldest: twoWeeksAgo.toString()
    });

    console.log(`Retrieved ${messages.messages?.length || 0} messages from the last two weeks`);

    // Analyze messages using Google Gemini
    console.log('Analyzing messages...');
    const analysis = await analyzeMessages(messages.messages || [], slack);

    // Generate analysis response
    const response = {
      channel: {
        name: channel.name,
        memberCount: channel.num_members,
        isPrivate: channel.is_private,
        topic: channel.topic?.value || '',
        purpose: channel.purpose?.value || ''
      },
      messageCount: messages.messages?.length || 0,
      analysisPeriod: {
        start: new Date(twoWeeksAgo * 1000).toISOString(),
        end: new Date().toISOString()
      },
      ...analysis,
      summary: {
        totalMessages: messages.messages?.length || 0,
        lastMessage: messages.messages?.[0]?.ts ? new Date(parseInt(messages.messages[0].ts) * 1000).toISOString() : null,
        messageFrequency: (messages.messages?.length || 0) > 0 ? 'Active' : 'Inactive',
        channelType: channel.is_private ? 'Private' : 'Public',
        memberCount: channel.num_members,
        analysisPeriod: 'Last 2 weeks'
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error.message,
        data: error.data,
        type: error.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
} 