import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { Risk } from '../types/risk';

interface RisksListProps {
  risks: Risk[];
}

export function RisksList({ risks }: RisksListProps) {
  console.log('RisksList received props:', { risks });

  if (!risks || risks.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Risks
        </Typography>
        <Typography color="text.secondary">
          No risks identified in this channel.
        </Typography>
      </Paper>
    );
  }

  const getSeverityColor = (severity: string): "error" | "warning" | "info" | "success" => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'success';
    }
  };

  // Sort risks by severity (High -> Medium -> Low)
  const sortedRisks = [...risks].sort((a, b) => {
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const severityA = a.severity.toLowerCase();
    const severityB = b.severity.toLowerCase();
    return (severityOrder[severityA] ?? 3) - (severityOrder[severityB] ?? 3);
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Risks
      </Typography>
      <List>
        {sortedRisks.map((risk, index) => (
          <ListItem key={index} sx={{ display: 'block', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <WarningIcon color={getSeverityColor(risk.severity)} sx={{ mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" gutterBottom>
                  {risk.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={risk.severity}
                    size="small"
                    color={getSeverityColor(risk.severity)}
                    variant="outlined"
                  />
                  {risk.suggested_owner && (
                    <Chip
                      label={`Owner: ${risk.suggested_owner}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {risk.status && (
                    <Chip
                      label={risk.status}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 