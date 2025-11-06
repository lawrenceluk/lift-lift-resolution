import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { ProgramBuilderQuestionnaire } from '@/components/ProgramBuilderQuestionnaire';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { QuestionnaireData } from '@/types/programBuilder';

export const ProgramBuilderQuestionnairePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login?returnTo=/library/new');
    }
  }, [user, authLoading, setLocation]);

  const handleNext = (data: QuestionnaireData) => {
    // Navigate to builder with questionnaire data in URL params
    const params = new URLSearchParams({
      q: JSON.stringify(data),
    });
    setLocation(`/builder?${params.toString()}`);
  };

  const handleCancel = () => {
    setLocation('/library');
  };

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/library')}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Create New Program</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Let's build your program
            </h2>
            <p className="text-sm text-gray-600">
              Answer a few quick questions and we'll create a personalized training program for you.
            </p>
          </div>

          <ProgramBuilderQuestionnaire onNext={handleNext} onCancel={handleCancel} />
        </div>
      </main>
    </div>
  );
};
