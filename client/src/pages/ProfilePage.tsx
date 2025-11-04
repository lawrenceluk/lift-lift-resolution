import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Trash2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { profile, isSyncing, error, updateProfile, deleteCoachNote } = useUserProfile();
  const { toast } = useToast();

  // Local state for form fields with auto-save
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setHeight(profile.height || '');
      setWeight(profile.weight || '');
      setNotes(profile.notes || '');
    }
  }, [profile]);

  // Auto-save on blur - only if value actually changed
  const handleFieldBlur = (field: string, value: string) => {
    if (!profile) return;

    // Get the current value from profile
    const currentValue = profile[field as keyof typeof profile];
    const newValue = value.trim() || undefined;

    // Only update if value actually changed
    if (newValue === currentValue) {
      return;
    }

    const updates: Record<string, string | undefined> = {};
    updates[field] = newValue;

    const { error: updateError } = updateProfile(updates);

    if (updateError) {
      toast({
        title: 'Error',
        description: updateError,
        variant: 'destructive',
      });
    } else {
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
      toast({
        title: `${fieldLabel} ${newValue ? 'updated' : 'cleared'}`,
      });
    }
  };

  // Handle coach note deletion - optimistic updates apply immediately
  const handleDeleteCoachNote = (index: number) => {
    const { error: deleteError } = deleteCoachNote(index);
    if (deleteError) {
      toast({
        title: 'Error',
        description: deleteError,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Note deleted',
      });
    }
  };

  // Parse coach notes into array (one note per line)
  const coachNotesList = profile?.coach_notes
    ? profile.coach_notes.split('\n').filter(Boolean)
    : [];

  if (!user) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : null}
        <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <p className="text-sm text-gray-600 mb-4">This information will be shared with the coach to personalize your training program.</p>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleFieldBlur('name', name)}
                    placeholder="Your name (optional)"
                  />
                </div>

                {/* Height */}
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <Input
                    id="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    onBlur={() => handleFieldBlur('height', height)}
                    placeholder="e.g., 6'2&quot;, 188cm"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <Input
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onBlur={() => handleFieldBlur('weight', weight)}
                    placeholder="e.g., 185lbs, 84kg"
                  />
                </div>
              </div>
            </div>

            {/* Training Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Notes</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add any notes the coach should know about. This might include injuries, equipment
                access, goals, preferences, or constraints.
              </p>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => handleFieldBlur('notes', notes)}
                placeholder="e.g., Home gym with barbell and dumbbells to 50lbs. Left knee sometimes bothers me. Training 4x/week, prefer 60min sessions."
                className="min-h-[120px]"
              />
            </div>

            {/* Coach Notes */}
            {coachNotesList.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Coach Notes</h2>
                <p className="text-sm text-gray-600 mb-4">
                  The coach can add observations here based on your training. You can delete notes
                  you disagree with.
                </p>

                <div className="space-y-2">
                  {coachNotesList.map((note, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <p className="text-sm text-blue-900 flex-1">{note}</p>
                      <button
                        onClick={() => handleDeleteCoachNote(index)}
                        className="text-blue-600 hover:text-red-600 transition-colors flex-shrink-0"
                        title="Delete this note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

        </div>
      </main>
    </div>
  );
};
