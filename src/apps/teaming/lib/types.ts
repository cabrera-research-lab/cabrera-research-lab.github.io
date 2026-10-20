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
  /** YYYY-MM-DD the words were set up. Null means created_at's calendar day. */
  set_on?: string | null;
  /** Shown on today from an earlier day this week; not a new submission. */
  carried?: boolean;
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
  completed?: boolean;
}

export interface PrioritySet {
  id: string;
  team_id: string;
  cadence: PriorityCadence;
  period_start: string;
  priority_items: PriorityItem[];
}

export interface PriorityItemInput {
  id?: string;
  sort_order: number;
  goal: string;
  owner: string;
  metric: string;
  action: string;
  completed?: boolean;
}
