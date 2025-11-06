import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useProgramLibrary } from '@/hooks/useProgramLibrary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, Clock, MoreVertical, Trash2, Copy, Play, CheckCircle, ListChecks } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ProgramCardSkeleton = () => (
  <Card className="w-full border-gray-200 bg-white">
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />

      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </CardContent>
  </Card>
);

export const ProgramLibraryPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { programs, currentProgramId, isLoading, error, selectProgram, duplicateProgram, deleteProgram } = useProgramLibrary();
  const { toast } = useToast();

  // State for handling actions
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  // Redirect if not logged in (wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login?returnTo=/library');
    }
  }, [user, authLoading, setLocation]);

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Action handlers
  const handleSwitchProgram = async (programId: string) => {
    try {
      setIsActionLoading(true);
      await selectProgram(programId);
      // Page will reload automatically after switch
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to switch program',
        variant: 'destructive',
      });
      setIsActionLoading(false);
    }
  };

  const handleCreateProgram = () => {
    // Navigate to questionnaire page to start AI-powered program builder
    setLocation('/library/new');
  };

  const handleDuplicateProgram = async (programId: string, programName: string) => {
    try {
      setIsActionLoading(true);
      await duplicateProgram(programId);
      toast({
        title: 'Program duplicated',
        description: `Created a copy of "${programName}"`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to duplicate program',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!programToDelete) return;

    try {
      setIsActionLoading(true);
      await deleteProgram(programToDelete);
      toast({
        title: 'Program deleted',
        description: 'The program has been removed from your library',
      });
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete program',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const openDeleteDialog = (programId: string) => {
    setProgramToDelete(programId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Show loading screen while auth is loading */}
      {authLoading || !user ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Program Library</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-96 mb-4" />
            <ProgramCardSkeleton />
            <ProgramCardSkeleton />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No programs found.</p>
            <p className="text-sm text-gray-500">
              Your workout program will appear here once you start tracking workouts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Manage your workout programs. Switch between programs, create new ones, or duplicate existing programs.
            </p>

            {programs.map((program) => {
              const isActive = program.id === currentProgramId;
              const weekCount = program.weeks?.length || 0;
              const displayName = program.name || 'Training Program';
              const displayDescription = program.description || 'No description yet';

              // Calculate session statistics
              const totalSessions = program.weeks?.reduce(
                (total, week) => total + (week.sessions?.length || 0),
                0
              ) || 0;
              const completedSessions = program.weeks?.reduce(
                (total, week) =>
                  total + (week.sessions?.filter((s) => s.completed).length || 0),
                0
              ) || 0;
              const completionPercentage = totalSessions > 0
                ? Math.round((completedSessions / totalSessions) * 100)
                : 0;

              return (
                <Card
                  key={program.id}
                  className={`w-full ${
                    isActive
                      ? 'border-blue-500 border-2 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {displayName}
                        </h3>
                        {isActive && (
                          <Badge className="bg-blue-600 hover:bg-blue-700">
                            <span className="font-medium text-white text-xs">ACTIVE</span>
                          </Badge>
                        )}
                      </div>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isActionLoading}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isActive && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleSwitchProgram(program.id)}
                                disabled={isActionLoading}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Switch to this program
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDuplicateProgram(program.id, displayName)}
                            disabled={isActionLoading}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {!isActive && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(program.id)}
                                disabled={isActionLoading}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{displayDescription}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {weekCount} {weekCount === 1 ? 'week' : 'weeks'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span>
                          {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {completionPercentage}% complete
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimeAgo(program.updated_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Create Program Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCreateProgram}
            >
              + Create Program
            </Button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
              All workout data for this program will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProgram}
              disabled={isActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
};
