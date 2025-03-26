'use client';

import { useState } from 'react';
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

interface Channel {
  id: string;
  name: string;
  topic: string;
  purpose: string;
  memberCount: number;
  isPrivate: boolean;
  isMember: boolean;
}

interface Error {
  title: string;
  message: string;
  details?: React.ReactNode;
}

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedChannelData, setSelectedChannelData] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  const handleChannelSelect = (channelName: string) => {
    setSelectedChannel(channelName);
    // Find the channel data from the list
    const channel = channels.find(ch => ch.name === channelName);
    if (channel) {
      setSelectedChannelData(channel);
    }
  };

  const handleChannelsUpdate = (newChannels: Channel[]) => {
    setChannels(newChannels);
  };

  const handleAnalyze = async () => {
    if (!selectedChannel) {
      setError({
        title: 'No Channel Selected',
        message: 'Please select a channel to analyze'
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAnalysisData(null);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelName: selectedChannel }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Analysis failed:', data);
        setError({
          title: data.error || 'Analysis failed',
          message: data.details?.message || data.error,
          details: (
            <Box sx={{ mt: 2 }}>
              {data.details?.steps && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    To fix this:
                  </Typography>
                  <List>
                    {data.details.steps.map((step: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemText primary={step} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {data.details?.missingScopes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Missing Permissions:
                  </Typography>
                  <List>
                    {data.details.missingScopes.map((scope: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={scope} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              {data.details?.installUrl && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    href={data.details.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reinstall Bot with Required Permissions
                  </Button>
                </Box>
              )}
            </Box>
          )
        });
        return;
      }

      setAnalysisData(data);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError({
        title: 'Analysis failed',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeRegistry>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Slack Channel Analysis
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <ChannelSearch 
              onChannelSelect={handleChannelSelect}
              onChannelsUpdate={handleChannelsUpdate}
            />
          </Box>

          {selectedChannel && (
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

          {error && (
            <Alert 
              severity="error" 
              sx={{ mt: 3 }}
            >
              <AlertTitle>{error.title}</AlertTitle>
              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                {error.message}
              </Typography>
              {error.details}
            </Alert>
          )}

          {analysisData && (
            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12}>
                <HealthMetrics metrics={analysisData.health} />
              </Grid>
              <Grid item xs={12} md={6}>
                <RisksList risks={analysisData.risks} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ActionItems actions={analysisData.actions} />
              </Grid>
            </Grid>
          )}
        </Box>
      </Container>
    </ThemeRegistry>
  );
} 