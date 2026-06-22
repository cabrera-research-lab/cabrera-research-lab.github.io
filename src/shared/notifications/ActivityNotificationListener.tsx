import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/shared/auth/AuthContext';
import {
  notificationForCohortActivityInsert,
  notificationForCommentInsert,
  notificationForRatingInsert,
  notificationForUpdateInsert,
} from '@/shared/notifications/activityNotifications';
import {
  getNotificationPermission,
  showDesktopNotification,
} from '@/shared/notifications/desktopNotifications';
import { useDesktopNotificationPreference } from '@/shared/notifications/useDesktopNotificationPreference';
import { requireSupabase } from '@/shared/lib/supabase';

type ActivityRow = Record<string, unknown>;

function actorIdFromRow(table: string, row: ActivityRow): string | null {
  switch (table) {
    case 'updates':
      return typeof row.user_id === 'string' ? row.user_id : null;
    case 'update_comments':
      return typeof row.author_id === 'string' ? row.author_id : null;
    case 'update_ratings':
      return typeof row.rater_id === 'string' ? row.rater_id : null;
    case 'mission_moments_cohort_activity':
      return typeof row.user_id === 'string' ? row.user_id : null;
    default:
      return null;
  }
}

async function buildNotification(table: string, row: ActivityRow) {
  switch (table) {
    case 'updates':
      return notificationForUpdateInsert(row);
    case 'update_comments':
      return notificationForCommentInsert(row);
    case 'update_ratings':
      return notificationForRatingInsert(row);
    case 'mission_moments_cohort_activity':
      return notificationForCohortActivityInsert(row);
    default:
      return null;
  }
}

export function ActivityNotificationListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enabled } = useDesktopNotificationPreference();
  const userIdRef = useRef(user?.id);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!user || !enabled || getNotificationPermission() !== 'granted') return;

    const sb = requireSupabase();

    async function handleInsert(
      table: string,
      payload: RealtimePostgresChangesPayload<ActivityRow>,
    ) {
      if (payload.eventType !== 'INSERT' || !payload.new) return;

      const actorId = actorIdFromRow(table, payload.new);
      if (actorId && actorId === userIdRef.current) return;

      try {
        const notification = await buildNotification(table, payload.new);
        if (!notification) return;
        showDesktopNotification(notification, (url) => navigateRef.current(url));
      } catch (error) {
        console.error('Failed to show activity notification', error);
      }
    }

    const channel = sb
      .channel('activity-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'updates' },
        (payload) => handleInsert('updates', payload as RealtimePostgresChangesPayload<ActivityRow>),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'update_comments' },
        (payload) =>
          handleInsert('update_comments', payload as RealtimePostgresChangesPayload<ActivityRow>),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'update_ratings' },
        (payload) =>
          handleInsert('update_ratings', payload as RealtimePostgresChangesPayload<ActivityRow>),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mission_moments_cohort_activity' },
        (payload) =>
          handleInsert(
            'mission_moments_cohort_activity',
            payload as RealtimePostgresChangesPayload<ActivityRow>,
          ),
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [user, enabled]);

  return null;
}
