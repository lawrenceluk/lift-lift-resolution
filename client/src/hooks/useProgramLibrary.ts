import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkoutProgram, Week } from '@/types/workout';
import { useAuth } from './useAuth';
import { createSampleWeeks } from '@/data/sampleWorkout';

const PROGRAM_ID_KEY = 'current_program_id';
const WORKOUT_WEEKS_KEY = 'workout_weeks';
const CURRENT_WEEK_KEY = 'current_week_index';
const PROGRAMS_CACHE_KEY = 'program_library_cache';

/**
 * Hook to manage the program library
 * Phase 1: Read-only list of all user programs
 * Phase 2+: Will add selectProgram, createProgram, deleteProgram methods
 */
export const useProgramLibrary = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track programs we've already attempted to generate metadata for
  const metadataGenerationAttempted = useRef<Set<string>>(new Set());

  /**
   * Load current program ID from localStorage
   */
  useEffect(() => {
    const programId = localStorage.getItem(PROGRAM_ID_KEY);
    setCurrentProgramId(programId);
  }, []);

  /**
   * Fetch all programs for the current user from database
   * Runs on mount and when user changes
   * Uses optimistic loading: show cache immediately, refresh in background
   */
  const fetchPrograms = useCallback(async (showLoading = true) => {
    if (!user) {
      setPrograms([]);
      setIsLoading(false);
      return;
    }

    try {
      // Only show loading spinner if explicitly requested (no cache available)
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPrograms(data || []);

      // Update cache
      if (data) {
        localStorage.setItem(PROGRAMS_CACHE_KEY, JSON.stringify(data));
      }

      console.log('Fetched programs from DB:', data?.length || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch programs';
      setError(message);
      console.error('Error fetching programs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Initial fetch on mount
   * Load from cache first, then refresh in background
   */
  useEffect(() => {
    if (!user) return;

    // Try to load from cache immediately
    try {
      const cached = localStorage.getItem(PROGRAMS_CACHE_KEY);
      if (cached) {
        const cachedPrograms = JSON.parse(cached) as WorkoutProgram[];
        setPrograms(cachedPrograms);
        setIsLoading(false);
        console.log('Loaded programs from cache:', cachedPrograms.length);

        // Refresh in background (don't show loading spinner)
        fetchPrograms(false);
      } else {
        // No cache, fetch with loading spinner
        fetchPrograms(true);
      }
    } catch (err) {
      console.error('Error loading cached programs:', err);
      // Cache invalid, fetch fresh
      fetchPrograms(true);
    }
  }, [user, fetchPrograms]);

  /**
   * Refresh programs manually
   * Useful after program metadata updates
   */
  const refreshPrograms = useCallback(() => {
    return fetchPrograms();
  }, [fetchPrograms]);

  /**
   * Generate AI metadata for a program
   * Updates local state in place when successful, fails silently on error
   */
  const generateMetadata = useCallback(async (programId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/programs/${programId}/generate-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate metadata: ${response.statusText}`);
      }

      const metadata = await response.json();
      console.log(`[Program Library] Generated metadata for ${programId}:`, metadata);

      // Update local state in place (no page refresh)
      setPrograms(prev =>
        prev.map(p =>
          p.id === programId
            ? { ...p, name: metadata.name, description: metadata.description }
            : p
        )
      );

      return metadata;
    } catch (error) {
      // Fail silently - user won't notice anything off
      console.error('[Program Library] Error generating metadata:', error);
    }
  }, [user]);

  /**
   * Auto-generate metadata for programs still named "Training Program"
   * Fires concurrent requests, fails silently
   */
  useEffect(() => {
    if (!user || isLoading || programs.length === 0) return;

    const generateMetadataForDefaultNames = async () => {
      // Find programs that need metadata generation and haven't been attempted yet
      const programsNeedingMetadata = programs.filter(
        p => (!p.name || p.name === 'Training Program') && !metadataGenerationAttempted.current.has(p.id)
      );

      if (programsNeedingMetadata.length === 0) return;

      // Mark as attempted to prevent duplicate requests
      programsNeedingMetadata.forEach(p => metadataGenerationAttempted.current.add(p.id));

      // Fire concurrent requests (don't await - let them run in background)
      // Errors are handled silently in generateMetadata
      programsNeedingMetadata.forEach(program => {
        generateMetadata(program.id);
      });
    };

    generateMetadataForDefaultNames();
  }, [user, isLoading, programs, generateMetadata]);

  /**
   * Phase 2: Select and switch to a different program
   * 1. Sync current program to cloud first (save any pending changes)
   * 2. Load selected program from database
   * 3. Replace localStorage with selected program
   * 4. Reload page to update app state
   */
  const selectProgram = useCallback(async (programId: string) => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      setError(null);

      // 1. Find the selected program
      const { data: selectedProgram, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!selectedProgram) {
        throw new Error('Program not found');
      }

      // 2. Replace localStorage with selected program
      localStorage.setItem(WORKOUT_WEEKS_KEY, JSON.stringify(selectedProgram.weeks));
      localStorage.setItem(PROGRAM_ID_KEY, programId);

      // Reset current week index to 0 when switching programs
      localStorage.setItem(CURRENT_WEEK_KEY, '0');

      // 3. Update local state
      setCurrentProgramId(programId);

      // 4. Reload to update app state (simple approach for Phase 2)
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch program';
      setError(message);
      console.error('Error switching program:', err);
      throw err;
    }
  }, [user]);

  /**
   * Phase 2: Create a new program
   * Creates with default name + sample data, switches to it
   */
  const createProgram = useCallback(async (name?: string, weeks?: Week[]) => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      setError(null);

      const newProgram: Omit<WorkoutProgram, 'created_at' | 'updated_at'> = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: name || undefined, // Will auto-generate if undefined
        description: undefined,
        weeks: weeks || createSampleWeeks(),
      };

      // Save to database
      const { error: insertError } = await supabase
        .from('workout_programs')
        .insert({
          ...newProgram,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      // Switch to the new program
      await selectProgram(newProgram.id);

      return newProgram.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create program';
      setError(message);
      console.error('Error creating program:', err);
      throw err;
    }
  }, [user, selectProgram]);

  /**
   * Phase 2: Duplicate an existing program
   * Copies structure, clears logged sets
   */
  const duplicateProgram = useCallback(async (sourceProgramId: string) => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      setError(null);

      // 1. Load source program
      const { data: sourceProgram, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', sourceProgramId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!sourceProgram) {
        throw new Error('Source program not found');
      }

      // 2. Clear logged sets from the weeks data
      const resetWeeks = (weeks: Week[]): Week[] => {
        return weeks.map(week => ({
          ...week,
          sessions: week.sessions.map(session => ({
            ...session,
            startedAt: undefined,
            completed: false,
            completedDate: undefined,
            duration: undefined,
            rating: undefined,
            exercises: session.exercises.map(exercise => ({
              ...exercise,
              sets: [], // Clear all logged sets
              skipped: false,
              userNotes: undefined,
            })),
          })),
        }));
      };

      // 3. Create duplicate with new ID
      const duplicateId = crypto.randomUUID();
      const duplicate: Omit<WorkoutProgram, 'created_at' | 'updated_at'> = {
        id: duplicateId,
        user_id: user.id,
        name: `${sourceProgram.name || 'Training Program'} (Copy)`,
        description: sourceProgram.description,
        weeks: resetWeeks(sourceProgram.weeks as Week[]),
      };

      // 4. Save to database
      const { error: insertError } = await supabase
        .from('workout_programs')
        .insert({
          ...duplicate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      // 5. Refresh the program list
      await refreshPrograms();

      return duplicateId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate program';
      setError(message);
      console.error('Error duplicating program:', err);
      throw err;
    }
  }, [user, refreshPrograms]);

  /**
   * Phase 2: Delete a program
   * Prevents deletion of the currently active program
   */
  const deleteProgram = useCallback(async (programId: string) => {
    if (!user) {
      throw new Error('User not logged in');
    }

    // Prevent deletion of active program
    if (programId === currentProgramId) {
      throw new Error('Cannot delete the currently active program. Switch to another program first.');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('workout_programs')
        .delete()
        .eq('id', programId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the program list
      await refreshPrograms();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete program';
      setError(message);
      console.error('Error deleting program:', err);
      throw err;
    }
  }, [user, currentProgramId, refreshPrograms]);

  return {
    programs,
    currentProgramId,
    isLoading,
    error,
    refreshPrograms,
    // Phase 2 methods
    selectProgram,
    createProgram,
    duplicateProgram,
    deleteProgram,
    // Phase 3 methods
    generateMetadata,
  };
};
