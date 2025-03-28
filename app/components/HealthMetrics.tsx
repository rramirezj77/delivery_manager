import {
  Paper,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import TopicIcon from '@mui/icons-material/Topic';
import InfoIcon from '@mui/icons-material/Info';
import { HealthMetrics as HealthMetricsType } from '../types/analysis';

interface HealthMetricsProps {
  metrics: HealthMetricsType | null;
  main_topics: string[];
}

export function HealthMetrics({ metrics, main_topics = [] }: HealthMetricsProps) {
  console.log('HealthMetrics received props:', { metrics, main_topics });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      default:
        return <TrendingFlatIcon color="warning" />;
    }
  };

  const getMetricIcon = (metricKey: string) => {
    switch (metricKey) {
      case 'overall_health':
        return <HealthAndSafetyIcon color="primary" />;
      case 'scope_management':
        return <AccountTreeIcon color="primary" />;
      case 'client_satisfaction':
        return <SentimentSatisfiedAltIcon color="primary" />;
      case 'team_performance':
        return <GroupsIcon color="primary" />;
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Project Health Indicators
      </Typography>
      {metrics && metrics.overall_health && metrics.scope_management && metrics.client_satisfaction && metrics.team_performance ? (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {getMetricIcon('overall_health')}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Overall Health
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography
                    variant="h4"
                    color={getScoreColor(metrics.overall_health.score)}
                  >
                    {metrics.overall_health.score}%
                  </Typography>
                  <Tooltip title={metrics.overall_health.details}>
                    {getTrendIcon(metrics.overall_health.trend)}
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {getMetricIcon('scope_management')}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Scope Management
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography
                    variant="h4"
                    color={getScoreColor(metrics.scope_management.score)}
                  >
                    {metrics.scope_management.score}%
                  </Typography>
                  <Tooltip title={metrics.scope_management.details}>
                    {getTrendIcon(metrics.scope_management.trend)}
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {getMetricIcon('client_satisfaction')}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Client Satisfaction
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography
                    variant="h4"
                    color={getScoreColor(metrics.client_satisfaction.score)}
                  >
                    {metrics.client_satisfaction.score}%
                  </Typography>
                  <Tooltip title={metrics.client_satisfaction.details}>
                    {getTrendIcon(metrics.client_satisfaction.trend)}
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {getMetricIcon('team_performance')}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Team Performance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography
                    variant="h4"
                    color={getScoreColor(metrics.team_performance.score)}
                  >
                    {metrics.team_performance.score}%
                  </Typography>
                  <Tooltip title={metrics.team_performance.details}>
                    {getTrendIcon(metrics.team_performance.trend)}
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {main_topics && main_topics.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Main Topics
              </Typography>
              <Grid container spacing={1}>
                {main_topics.map((topic, index) => (
                  <Grid item key={index}>
                    <Chip
                      icon={<TopicIcon />}
                      label={topic}
                      variant="outlined"
                      sx={{ 
                        borderRadius: '16px',
                        '& .MuiChip-label': {
                          px: 1
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 3 }}>
          <InfoIcon />
          <Typography>
            Health metrics are not available for this channel. This requires more message data to generate accurate metrics.
          </Typography>
        </Box>
      )}
    </Paper>
  );
} 