import React, { useState, useEffect } from 'react';
import { HashtagIcon, LockClosedIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Channel } from '../types/channel';

interface ChannelSelectorProps {
  onChannelSelect: (channel: Channel) => void;
}

export default function ChannelSelector({ onChannelSelect }: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/channels?refresh=${forceRefresh}`);
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      setChannels(data.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleRefresh = () => {
    fetchChannels(true);
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          title="Refresh channels list"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <HashtagIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">{channel.name}</span>
                </div>
                {channel.isPrivate && (
                  <LockClosedIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
} 