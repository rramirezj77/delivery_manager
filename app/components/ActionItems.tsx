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
import AssignmentIcon from '@mui/icons-material/Assignment';
import { ActionItem as ActionItemType } from '../types/analysis';

interface ActionItemsProps {
  items: ActionItemType[];
}

export function ActionItems({ items }: ActionItemsProps) {
  console.log('ActionItems received props:', { items });

  if (!items || items.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AssignmentIcon color="primary" />
          <Typography variant="h6">
            Action Items
          </Typography>
        </Box>
        <Typography color="text.secondary">
          No action items found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AssignmentIcon color="primary" />
        <Typography variant="h6">
          Action Items
        </Typography>
      </Box>
      <List>
        {items.map((action, index) => (
          <ListItem
            key={index}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body1">{action.description}</Typography>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip
                      label={`Owner: ${action.owner}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {action.due_date && (
                      <Chip
                        label={`Due: ${action.due_date}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 