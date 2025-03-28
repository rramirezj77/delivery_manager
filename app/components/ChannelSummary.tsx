import { Box, Typography, Paper, Grid } from '@mui/material';

interface ChannelSummaryProps {
  summary: {
    totalMessages: number;
    lastMessage: string | null;
    messageFrequency: string;
    channelType: string;
    memberCount: number;
  };
}

export function ChannelSummary({ summary }: ChannelSummaryProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Channel Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            Channel Type
          </Typography>
          <Typography variant="body1">
            {summary.channelType}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            Member Count
          </Typography>
          <Typography variant="body1">
            {summary.memberCount} members
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            Total Messages
          </Typography>
          <Typography variant="body1">
            {summary.totalMessages}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            Last Message
          </Typography>
          <Typography variant="body1">
            {summary.lastMessage ? new Date(summary.lastMessage).toLocaleString() : 'No messages'}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary">
            Activity Status
          </Typography>
          <Typography variant="body1">
            {summary.messageFrequency}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
} 