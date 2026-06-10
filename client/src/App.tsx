import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { WorkoutTrackerApp } from "@/pages/WorkoutTrackerApp";
import { HowItWorks } from "@/pages/HowItWorks";
import { WorkoutTimer } from "@/components/WorkoutTimer";
import { WorkoutProgramProvider } from "@/contexts/WorkoutProgramContext";
import { WorkoutTimerProvider } from "@/contexts/WorkoutTimerContext";
import { SecretGate } from "@/components/SecretGate";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={WorkoutTrackerApp} />
      <Route path="/how-it-works" component={HowItWorks} />
      {/* Absolute session IDs (s-<date>-<slug>) — opaque tokens, no positional routing */}
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
        {/* Shell-level access gate: everything below requires the code. The gate
            sits outside the workout module providers — it gates the whole app. */}
        <SecretGate>
          <WorkoutProgramProvider>
            <WorkoutTimerProvider>
              <Toaster />
              <Router />
              {/* Global components - persist across routes */}
              <WorkoutTimer />
            </WorkoutTimerProvider>
          </WorkoutProgramProvider>
        </SecretGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
