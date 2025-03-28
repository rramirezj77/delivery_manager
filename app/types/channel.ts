export interface Channel {
  id: string;
  name: string;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  memberCount: number;
  isPrivate: boolean;
  isMember: boolean;
} 