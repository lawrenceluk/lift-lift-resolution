import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { WorkoutTrackerApp } from "@/pages/WorkoutTrackerApp";
import { HowItWorks } from "@/pages/HowItWorks";
import { AuthPage } from "@/pages/AuthPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProgramLibraryPage } from "@/pages/ProgramLibraryPage";
import { ProgramBuilderQuestionnairePage } from "@/pages/ProgramBuilderQuestionnaireePage";
import { ProgramBuilderPage } from "@/pages/ProgramBuilderPage";
import { CoachChat } from "@/components/CoachChat";
import { WorkoutProgramProvider } from "@/contexts/WorkoutProgramContext";
import { CoachChatProvider } from "@/contexts/CoachChatContext";
import { AuthProvider } from "@/contexts/AuthContext";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={WorkoutTrackerApp} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/login" component={AuthPage} />
      <Route path="/login/callback" component={AuthCallbackPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/library/new" component={ProgramBuilderQuestionnairePage} />
      <Route path="/library" component={ProgramLibraryPage} />
      <Route path="/builder" component={ProgramBuilderPage} />
      <Route path="/:weekId" component={WorkoutTrackerApp} />
      <Route path="/:sessionId" component={WorkoutTrackerApp} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WorkoutProgramProvider>
            <CoachChatProvider>
              <Toaster />
              <Router />
              {/* Global Coach Chat - persists across routes */}
              <CoachChat />
            </CoachChatProvider>
          </WorkoutProgramProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
