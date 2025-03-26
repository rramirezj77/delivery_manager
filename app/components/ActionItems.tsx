import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface Action {
  id: number;
  status: 'pending' | 'completed';
  description: string;
}

interface ActionItemsProps {
  actions: Action[];
}

export function ActionItems({ actions }: ActionItemsProps) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AssignmentIcon color="primary" />
        <Typography variant="h6">
          Action Items
        </Typography>
      </Box>

      <List>
        {actions.map((action) => (
          <ListItem
            key={action.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemIcon>
              {action.status === 'completed' ? (
                <CheckCircleIcon color="success" />
              ) : (
                <PendingIcon color="warning" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={action.description}
              secondary={action.status.charAt(0).toUpperCase() + action.status.slice(1)}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 