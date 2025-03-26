import { Paper, Box, Typography, LinearProgress } from '@mui/material';

interface HealthMetricsProps {
  metrics: {
    overall: number;
    scope: number;
    satisfaction: number;
    performance: number;
  };
}

export function HealthMetrics({ metrics }: HealthMetricsProps) {
  const getColorForScore = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const MetricItem = ({ label, value }: { label: string; value: number }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1">{label}</Typography>
        <Typography variant="body1" fontWeight="bold">
          {value}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={getColorForScore(value) as 'success' | 'warning' | 'error'}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Health Metrics
      </Typography>
      <Box sx={{ mt: 2 }}>
        <MetricItem label="Overall Health" value={metrics.overall} />
        <MetricItem label="Scope Management" value={metrics.scope} />
        <MetricItem label="Client Satisfaction" value={metrics.satisfaction} />
        <MetricItem label="Team Performance" value={metrics.performance} />
      </Box>
    </Paper>
  );
} 