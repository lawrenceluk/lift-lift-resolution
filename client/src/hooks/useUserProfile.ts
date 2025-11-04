import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { useAuth } from './useAuth';

const PROFILE_STORAGE_KEY = 'user_profile';

/**
 * Create a simple hash of profile to detect changes
 * Used to avoid unnecessary syncs
 */
const hashProfile = (profile: UserProfile | null): string => {
  if (!profile) return '';
  return JSON.stringify(profile);
};

/**
 * Hook to manage user profile data
 * Uses localStorage as primary store for instant UI responsiveness
 * Background syncs to database with eventual consistency
 * Optimistic updates: changes apply immediately, sync happens asynchronously
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncedProfileRef = useRef<string>(''); // Track last synced state

  /**
   * Load profile from localStorage and queue background sync from DB
   */
  useEffect(() => {
    try {
      setError(null);

      if (!user) {
        setProfile(null);
        return;
      }

      // Load from localStorage immediately
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verify it belongs to current user
        if (parsed.user_id === user.id) {
          setProfile(parsed);
          lastSyncedProfileRef.current = hashProfile(parsed);
        }
      } else {
        // New user, create empty profile
        const newProfile: UserProfile = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: undefined,
          height: undefined,
          weight: undefined,
          notes: undefined,
          coach_notes: undefined,
          updated_at: new Date().toISOString(),
        };
        setProfile(newProfile);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
        lastSyncedProfileRef.current = hashProfile(newProfile);
      }

      // Background sync from DB (non-blocking)
      // Don't automatically upload - only load if DB has newer data
      syncProfileFromDB();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, [user?.id]);

  /**
   * Fetch latest profile from DB and merge with local changes
   * Prioritizes local changes (eventual consistency)
   */
  const syncProfileFromDB = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id);

      // Handle any errors other than "no rows found"
      if (fetchError) {
        throw fetchError;
      }

      // data will be an array, even if empty
      if (data && Array.isArray(data) && data.length > 0) {
        const dbProfile = data[0] as UserProfile;
        console.log('Synced profile from DB:', dbProfile);
        // Merge: local changes override DB values
        setProfile((current) => {
          if (!current) return dbProfile;
          // Local changes (newer) take precedence over DB values
          return {
            ...dbProfile,
            ...current,
            user_id: user.id,
          };
        });
      } else {
        console.log('No profile found in DB for user:', user.id);
      }
    } catch (err) {
      // Silently fail background sync, don't block user
      console.warn('Failed to sync profile from DB:', err);
    }
  }, [user]);

  /**
   * Sync profile to database in background
   * Only syncs if data has actually changed
   * Non-blocking, errors don't prevent UI updates
   */
  const syncProfileToDB = useCallback(async () => {
    if (!user || !profile) {
      console.warn('syncProfileToDB: user or profile missing', { user: !!user, profile: !!profile });
      return;
    }

    const currentHash = hashProfile(profile);
    // Only sync if data has changed since last sync
    if (currentHash === lastSyncedProfileRef.current) {
      console.log('No profile changes detected, skipping sync');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('Syncing profile to DB for user:', user.id);

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: profile.id,
            user_id: user.id,
            name: profile.name,
            height: profile.height,
            weight: profile.weight,
            notes: profile.notes,
            coach_notes: profile.coach_notes,
            updated_at: profile.updated_at,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw upsertError;
      }

      // Mark as synced
      lastSyncedProfileRef.current = currentHash;
      console.log('Profile synced successfully');
    } catch (err) {
      // Log but don't crash - local data is safe in localStorage
      console.error('Failed to sync profile to DB:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, profile]);

  /**
   * Queue profile for syncing to DB
   * Uses debounce to batch multiple changes
   * Only queues if there are actual changes
   */
  const queueSync = useCallback(() => {
    // Check if there are changes before queuing
    const currentHash = hashProfile(profile);
    if (currentHash === lastSyncedProfileRef.current) {
      console.log('No profile changes to queue');
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncProfileToDB();
    }, 1000); // Debounce for 1 second
  }, [profile, syncProfileToDB]);

  /**
   * Update profile field optimistically and queue for sync
   * Changes apply immediately to local state and localStorage
   * Database sync happens asynchronously in background
   */
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!user || !profile) {
        setError('No user logged in');
        return { error: 'No user logged in' };
      }

      try {
        setError(null);

        const updated: UserProfile = {
          ...profile,
          ...updates,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };

        // Optimistic update: apply immediately
        setProfile(updated);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));

        // Queue background sync to database
        queueSync();

        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        return { error: message };
      }
    },
    [user, profile, queueSync]
  );

  /**
   * Delete a coach note by index
   * Removes the note from the coach_notes string
   * Optimistically applies change, syncs to DB in background
   */
  const deleteCoachNote = useCallback(
    (noteIndex: number) => {
      if (!profile || !profile.coach_notes) {
        return { error: 'No notes to delete' };
      }

      try {
        setError(null);

        // Split notes by newline, remove the one at noteIndex
        const noteLines = profile.coach_notes.split('\n').filter(Boolean);

        if (noteIndex < 0 || noteIndex >= noteLines.length) {
          return { error: 'Invalid note index' };
        }

        noteLines.splice(noteIndex, 1);
        const updatedNotes = noteLines.join('\n');

        return updateProfile({ coach_notes: updatedNotes });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete note';
        setError(message);
        return { error: message };
      }
    },
    [profile, updateProfile]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    profile,
    isSyncing,
    error,
    updateProfile,
    deleteCoachNote,
  };
};
