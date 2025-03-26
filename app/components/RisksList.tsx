import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Risk {
  id: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface RisksListProps {
  risks: Risk[];
}

export function RisksList({ risks }: RisksListProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ErrorOutlineIcon color="error" />
        <Typography variant="h6">
          Identified Risks
        </Typography>
      </Box>
      
      <List>
        {risks.map((risk) => (
          <ListItem
            key={risk.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemText
              primary={risk.description}
              secondary={
                <Chip
                  label={risk.severity.toUpperCase()}
                  size="small"
                  color={getSeverityColor(risk.severity) as 'error' | 'warning' | 'success' | 'default'}
                  sx={{ mt: 1 }}
                />
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 