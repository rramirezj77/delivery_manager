'use client';

import { useState, useEffect } from 'react';
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Typography,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon,
  Button,
  InputAdornment,
  AlertTitle,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import debounce from 'lodash/debounce';

interface Channel {
  id: string;
  name: string;
  topic: string;
  purpose: string;
  memberCount: number;
  isPrivate: boolean;
  isMember: boolean;
}

interface ChannelSearchProps {
  onChannelSelect: (channelName: string) => void;
  onChannelsUpdate: (channels: Channel[]) => void;
}

export default function ChannelSearch({ onChannelSelect, onChannelsUpdate }: ChannelSearchProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [totalChannels, setTotalChannels] = useState(0);
  const [accessibleChannels, setAccessibleChannels] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchChannels = async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      console.log('Searching channels with query:', query);
      
      const response = await fetch(`/api/channels?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      console.log('Channels response:', data);
      
      // Sort channels with bot members first
      const sortedChannels = data.channels.sort((a: Channel, b: Channel) => {
        if (a.isMember && !b.isMember) return -1;
        if (!a.isMember && b.isMember) return 1;
        return 0;
      });
      
      setChannels(sortedChannels);
      onChannelsUpdate(sortedChannels);
      setTotalChannels(data.totalChannels || 0);
      setAccessibleChannels(data.accessibleChannels || 0);
      setIsInitialLoad(false);
    } catch (err: any) {
      console.error('Error fetching channels:', err);
      setError(err.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Autocomplete
        options={channels}
        getOptionLabel={(option) => `#${option.name}`}
        onChange={(event, newValue) => {
          if (newValue) {
            onChannelSelect(newValue.name);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search channels"
            variant="outlined"
            fullWidth
            onChange={(e) => {
              const query = e.target.value;
              if (query.startsWith('#')) {
                fetchChannels(query.slice(1));
              } else {
                fetchChannels(query);
              }
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading && (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1">#{option.name}</Typography>
                {option.topic && (
                  <Typography variant="caption" color="text.secondary">
                    {option.topic}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {option.isMember ? (
                  <Chip
                    size="small"
                    label="Bot is member"
                    color="success"
                    icon={<CheckCircleIcon />}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Bot not in channel"
                    color="error"
                    icon={<ErrorIcon />}
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  {option.memberCount} members
                </Typography>
              </Box>
            </Box>
          </li>
        )}
        loading={loading}
        loadingText="Loading channels..."
        noOptionsText={error || "No channels found"}
        sx={{
          '& .MuiAutocomplete-listbox': {
            maxHeight: 400,
          },
        }}
      />
      
      {debug && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Channel Information</AlertTitle>
          <Typography variant="body2">
            Total channels: {totalChannels}
          </Typography>
          <Typography variant="body2">
            Accessible channels: {accessibleChannels}
          </Typography>
          <Typography variant="body2">
            Search query: {channels.length > 0 ? channels[0].name : 'None'}
          </Typography>
        </Alert>
      )}
      
      {isInitialLoad && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && !isInitialLoad && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
} 