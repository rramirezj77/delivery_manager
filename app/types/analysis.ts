import { Risk } from './risk';

export interface HealthMetrics {
  overall_health?: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    details: string;
  };
  scope_management?: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    details: string;
  };
  client_satisfaction?: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    details: string;
  };
  team_performance?: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    details: string;
  };
}

export interface ActionItem {
  description: string;
  owner: string;
  due_date: string;
}

export interface AnalysisData {
  main_topics: string[];
  risks: Risk[];
  actions: ActionItem[];
  health: HealthMetrics | null;
  next_steps?: {
    description: string;
    suggested_owner: string;
    priority: string;
  }[];
} 