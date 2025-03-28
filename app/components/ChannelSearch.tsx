'use client';

import { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import debounce from 'lodash/debounce';
import { Channel } from '../types/channel';

interface ChannelSearchProps {
  onChannelSelect: (channel: Channel) => void;
  selectedChannel?: Channel | null;
}

export default function ChannelSearch({ onChannelSelect, selectedChannel }: ChannelSearchProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(selectedChannel?.name || '');

  // Function to fetch channels
  const fetchChannels = useCallback(async (query: string = '', forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching channels with query:', query, 'forceRefresh:', forceRefresh);
      
      const response = await fetch(`/api/channels?q=${encodeURIComponent(query)}&refresh=${forceRefresh}`);
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      console.log('Received channels:', {
        total: data.channels.length,
        query: query || 'none',
        forceRefresh
      });
      
      setChannels(data.channels);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load of channels
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== selectedChannel?.name) {
        fetchChannels(inputValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, selectedChannel, fetchChannels]);

  const handleRefresh = () => {
    fetchChannels(inputValue, true);
  };

  const handleSelectionChange = (channel: Channel | null) => {
    if (channel) {
      onChannelSelect(channel);
    }
  };

  const renderOption = (props: any, option: Channel) => {
    const { key, ...otherProps } = props;
    return (
      <li key={key} {...otherProps}>
        <ListItemIcon>
          {option.isPrivate ? <LockIcon /> : <PublicIcon />}
        </ListItemIcon>
        <ListItemText
          primary={option.name}
          secondary={
            <Box component="span">
              <Typography component="span" variant="body2" color="text.secondary" display="block">
                {option.topic?.value || 'No topic'}
              </Typography>
              <Typography component="span" variant="body2" color="text.secondary" display="block">
                {option.purpose?.value || 'No purpose'}
              </Typography>
              <Box component="span" sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Chip
                  size="small"
                  label={`${option.memberCount} members`}
                  color="primary"
                  variant="outlined"
                />
                {option.isMember ? (
                  <Chip
                    size="small"
                    label="Member"
                    color="success"
                    variant="outlined"
                    icon={<CheckCircleIcon />}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Not a member"
                    color="warning"
                    variant="outlined"
                    icon={<ErrorIcon />}
                  />
                )}
              </Box>
            </Box>
          }
        />
      </li>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <Autocomplete
          value={selectedChannel || null}
          onChange={(_, newValue) => handleSelectionChange(newValue)}
          inputValue={inputValue}
          onInputChange={(_, newValue) => setInputValue(newValue)}
          options={channels}
          loading={isLoading}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search channels"
              placeholder="Type to search channels..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={renderOption}
          loadingText="Searching channels..."
          noOptionsText={error || (inputValue ? "No channels found" : "Type to search channels")}
          sx={{
            flex: 1,
            '& .MuiAutocomplete-listbox': {
              maxHeight: 400,
            },
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
        />
        <Tooltip title="Refresh channels list">
          <span>
            <IconButton
              onClick={handleRefresh}
              color="primary"
              disabled={isLoading}
              sx={{ 
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
} 