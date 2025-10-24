import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { WorkoutTrackerApp } from "@/pages/WorkoutTrackerApp";
import { HowItWorks } from "@/pages/HowItWorks";
import { CoachChat } from "@/components/CoachChat";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={WorkoutTrackerApp} />
      <Route path="/how-it-works" component={HowItWorks} />
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
      <TooltipProvider>
        <Toaster />
        <Router />
        {/* Global Coach Chat - persists across routes */}
        <CoachChat />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
