'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from '@mui/material';
import { HealthMetrics } from './components/HealthMetrics';
import { RisksList } from './components/RisksList';
import { ActionItems } from './components/ActionItems';
import { ThemeRegistry } from './components/ThemeRegistry';
import ChannelSearch from './components/ChannelSearch';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Channel } from './types/channel';
import { AnalysisData } from './types/analysis';

interface Error {
  title: string;
  message: string;
  details?: React.ReactNode;
}

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedChannelData, setSelectedChannelData] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel.name);
    setSelectedChannelData(channel);
  };

  const handleChannelsUpdate = (newChannels: Channel[]) => {
    setChannels(newChannels);
  };

  const handleAnalyze = async () => {
    if (!selectedChannelData) {
      setError({
        title: 'No Channel Selected',
        message: 'Please select a channel first',
        details: 'You need to select a channel from the dropdown before analyzing.'
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Analyzing channel:', selectedChannelData.name);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: selectedChannelData.name
        }),
      });

      const data = await response.json();
      console.log('Analysis data received:', data);

      if (!response.ok) {
        if (response.status === 403 && data.error === 'Bot not a member') {
          setError({
            title: 'Bot Access Required',
            message: 'The bot needs to be added to this channel first',
            details: data.steps || [
              'Open the channel in Slack',
              'Type /invite @deliverymanager',
              'Or click the channel name and select "Integrations"',
              'Click "Add apps" and find "delivery_manager"'
            ]
          });
          return;
        }
        throw new Error(data.error || 'Failed to analyze channel');
      }

      setAnalysisData(data);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError({
        title: 'Analysis Failed',
        message: err.message || 'Failed to analyze channel',
        details: err.details || 'An unexpected error occurred while analyzing the channel.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysisData) {
      console.log('Analysis data updated:', {
        main_topics: analysisData.main_topics,
        risks: analysisData.risks,
        action_items: analysisData.actions,
        health: analysisData.health
      });
    }
  }, [analysisData]);

  return (
    <ThemeRegistry>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Delivery Manager
        </Typography>
        <Box sx={{ mt: 4 }}>
          <ChannelSearch 
            onChannelSelect={handleChannelSelect}
            selectedChannel={selectedChannelData}
          />
        </Box>

        {selectedChannelData && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAnalyze}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Analyzing...' : 'Analyze Channel'}
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error">
              {error.message}
            </Typography>
          </Box>
        )}
        {analysisData && selectedChannelData && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4 }}>
              Analysis Report for #{selectedChannelData.name}
            </Typography>
            
            {/* Channel Summary Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Channel Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Channel Type</Typography>
                  <Typography variant="body1">{selectedChannelData.isPrivate ? 'Private' : 'Public'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Members</Typography>
                  <Typography variant="body1">{selectedChannelData.memberCount} members</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Messages Analyzed</Typography>
                  <Typography variant="body1">{analysisData.messageCount} messages</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Analysis Period</Typography>
                  <Typography variant="body1">Last 2 weeks</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
              {/* Health Metrics - Full Width */}
              <Grid item xs={12}>
                <HealthMetrics 
                  metrics={analysisData.health}
                  main_topics={analysisData.main_topics}
                />
              </Grid>

              {/* Risks and Action Items - Side by Side */}
              <Grid item xs={12} md={6}>
                <RisksList risks={analysisData.risks} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ActionItems items={analysisData.actions} />
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </ThemeRegistry>
  );
} 