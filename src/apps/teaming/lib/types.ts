export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type PriorityCadence = 'weekly' | 'monthly' | 'quarterly';

export interface Team {
  id: string;
  name: string;
  slug: string;
}

export interface Profile {
  user_id: string;
  display_name: string;
  username: string | null;
  default_team_id: string | null;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'member' | 'lead';
}

export interface UpdateRow {
  id: string;
  team_id: string;
  user_id: string;
  cadence: Cadence;
  answers: string[];
  self_mission_score: number | null;
  created_at: string;
  profiles?: { display_name: string };
  teams?: { name: string };
}

export interface UpdateRating {
  id: string;
  update_id: string;
  rater_id: string;
  stars: number;
  profiles?: { display_name: string };
}

export interface UpdateComment {
  id: string;
  update_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string };
}

export interface PriorityItem {
  id?: string;
  sort_order: number;
  goal: string;
  owner: string;
  metric: string;
  action: string;
}

export interface PrioritySet {
  id: string;
  team_id: string;
  cadence: PriorityCadence;
  period_start: string;
  priority_items: PriorityItem[];
}

export interface PriorityItemInput {
  sort_order: number;
  goal: string;
  owner: string;
  metric: string;
  action: string;
}
