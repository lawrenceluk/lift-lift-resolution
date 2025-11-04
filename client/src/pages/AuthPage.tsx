import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/LoginForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();

  // If already authenticated, redirect to home
  if (user && !authLoading) {
    setLocation('/');
    return null;
  }

  // Show welcome toast when user logs in (after profile loads)
  useEffect(() => {
    if (user && profile) {
      if (profile.name) {
        toast({
          title: `Welcome back, ${profile.name}!`,
        });
      } else {
        toast({
          title: 'You\'re logged in!',
        });
      }
    }
  }, [user, profile?.name, toast]);

  const handleAuthSuccess = () => {
    // Redirect to home after successful auth
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Home</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lift Lift Resolution</h1>
            <p className="text-gray-600">Track your workouts. Build your program.</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Log in with your email</h2>
            <LoginForm onSuccess={handleAuthSuccess} />
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-600 text-center mt-6">
            You can use the app as a guest. Sign in with your email to save your profile and progress across devices.
          </p>
        </div>
      </main>
    </div>
  );
};
