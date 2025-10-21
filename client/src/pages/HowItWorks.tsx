import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Copy, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useWorkoutProgram } from '@/hooks/useWorkoutProgram';
import { importWeeks } from '@/utils/localStorage';

const generatePrompt = (preferences: {
  duration: string;
  goal: string;
  experience: string;
  sessions: string;
  equipment: string;
  constraints: string;
}) => `I need you to create a structured workout program in JSON format for my workout tracking app.

Please generate a training program with the following specifications:
- Duration: ${preferences.duration || '4 weeks'}
- Training goal: ${preferences.goal || 'hypertrophy'}
- Experience level: ${preferences.experience || 'intermediate'}
- Sessions per week: ${preferences.sessions || '4'}
- Available equipment: ${preferences.equipment || 'full gym'}
${preferences.constraints ? `- Additional preferences: ${preferences.constraints}` : ''}

The output MUST be valid JSON matching this exact structure:

\`\`\`json
[
  {
    "id": "week-1",
    "weekNumber": 1,
    "phase": "Foundation",
    "startDate": "2025-01-06",
    "endDate": "2025-01-12",
    "description": "Optional description of the week's focus",
    "sessions": [
      {
        "id": "week-1-session-1",
        "name": "Lower Body",
        "warmup": ["5-10 min light cardio", "Hip mobility drills"],
        "completed": false,
        "exercises": [
          {
            "id": "week-1-session-1-exercise-1",
            "name": "Back Squat",
            "groupLabel": "A1",
            "warmupSets": 2,
            "workingSets": 3,
            "reps": "8-10",
            "targetLoad": "2-3 RIR",
            "restSeconds": 180,
            "notes": "Focus on depth and control",
            "sets": []
          }
        ]
      }
    ]
  }
]
\`\`\`

Important guidelines:
- IDs follow the pattern: "week-{weekNumber}", "week-{weekNumber}-session-{sessionNumber}", "week-{weekNumber}-session-{sessionNumber}-exercise-{exerciseNumber}"
- All numbers in IDs use 1-based indexing (week-1, not week-0)
- startDate and endDate should be in YYYY-MM-DD format
- reps can be a range (e.g., "8-10") or a single number (e.g., "12")
- targetLoad can be RIR (reps in reserve), percentage (e.g., "75%"), or weight (e.g., "135 lbs")
- groupLabel is optional and used for supersets/circuits (e.g., "A1", "A2" for paired exercises)
- restSeconds is the rest period after each set
- warmup array is optional but recommended
- sets array should always be empty [] in the initial program (users log sets during workouts)
- completed should be false for all sessions initially
- cardio is optional and can be added to any session with this structure:
  \`\`\`json
  "cardio": {
    "type": "zone2",
    "duration": 30,
    "modality": "bike",
    "instructions": "Stay in zone 2, conversational pace",
    "completed": false
  }
  \`\`\`

Please provide ONLY the JSON output, no additional explanation.`;

export const HowItWorks: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { importWeeks: importWeeksHook } = useWorkoutProgram();
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState({
    duration: '4 weeks',
    goal: 'hypertrophy',
    experience: 'intermediate',
    sessions: '4',
    equipment: 'full gym',
    constraints: '',
  });

  const handleCopyPrompt = async () => {
    const prompt = generatePrompt(preferences);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Prompt copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedWeeks = await importWeeks(file);
      importWeeksHook(importedWeeks);
      toast({
        title: 'Program imported',
        description: 'Your workout program has been loaded successfully.',
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import workout program. Please check the file.',
        variant: 'destructive',
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />

      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3 w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">How It Works</h1>
        </div>
      </header>

      <main className="px-4 pt-8 pb-12 w-full max-w-2xl">
        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">What is this app?</h2>
            <p className="text-sm text-gray-700">
              Lift Lift Resolution is a workout tracking app designed for structured training programs. It helps you follow
              multi-week training plans, track your exercise performance set-by-set, and monitor your progress
              over time.
            </p>
            <p className="text-sm text-gray-700">
              Unlike generic workout apps, this tool is built for people who follow periodized programs with
              specific phases, progressive overload, and detailed exercise prescriptions.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Using the app</h2>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Navigating your program</h3>
              <p className="text-sm text-gray-700">
                Your program is organized by weeks. Use the Previous/Next buttons to navigate between weeks.
                Each week shows all scheduled workout sessions with their completion status.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Logging workouts</h3>
              <p className="text-sm text-gray-700">
                Tap any workout session to begin. You'll see all exercises with their prescribed sets, reps,
                and target loads. As you complete each set, log the weight, reps, and RIR (reps in reserve).
                The app automatically tracks your progress and timestamps each workout.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Backing up your data</h3>
              <p className="text-sm text-gray-700">
                Your workout data is stored locally in your browser. Use the "Export Program" option to
                download a JSON backup that includes all your logged sets and progress. You can import this
                file later to restore your data or transfer it to another device.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">How to create your workout plan</h2>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Option 1: Use an AI to generate your program</h3>
              <p className="text-sm text-gray-700">
                You can use ChatGPT, Claude, or any other LLM to generate a workout program. Fill out your
                preferences below, then copy the generated prompt to paste into your AI of choice.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-sm">Duration</Label>
                    <Input
                      id="duration"
                      value={preferences.duration}
                      onChange={(e) => setPreferences({ ...preferences, duration: e.target.value })}
                      placeholder="e.g., 4 weeks, 8 weeks"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessions" className="text-sm">Sessions per week</Label>
                    <Input
                      id="sessions"
                      value={preferences.sessions}
                      onChange={(e) => setPreferences({ ...preferences, sessions: e.target.value })}
                      placeholder="e.g., 3, 4, 5"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="goal" className="text-sm">Training goal</Label>
                    <Input
                      id="goal"
                      value={preferences.goal}
                      onChange={(e) => setPreferences({ ...preferences, goal: e.target.value })}
                      placeholder="e.g., strength, hypertrophy"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience" className="text-sm">Experience level</Label>
                    <Input
                      id="experience"
                      value={preferences.experience}
                      onChange={(e) => setPreferences({ ...preferences, experience: e.target.value })}
                      placeholder="e.g., beginner, intermediate"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="equipment" className="text-sm">Available equipment</Label>
                  <Input
                    id="equipment"
                    value={preferences.equipment}
                    onChange={(e) => setPreferences({ ...preferences, equipment: e.target.value })}
                    placeholder="e.g., full gym, dumbbells only, bodyweight"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="constraints" className="text-sm">Additional preferences (optional)</Label>
                  <Textarea
                    id="constraints"
                    value={preferences.constraints}
                    onChange={(e) => setPreferences({ ...preferences, constraints: e.target.value })}
                    placeholder="Any specific preferences, injuries to work around, or other constraints..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>

              <Button onClick={handleCopyPrompt} className="w-full">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy prompt for AI
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-700">
                After the AI generates the JSON, save it to a file (e.g., <code className="bg-gray-100 px-1 rounded">my-workout.json</code>),
                then import it using the button below.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Option 2: Create your own JSON file</h3>
              <p className="text-sm text-gray-700">
                If you're comfortable with JSON, you can create your own workout program file following the
                structure shown in the prompt above. The key requirements are:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                <li>Use the hierarchical ID format (week-X-session-Y-exercise-Z)</li>
                <li>Include all required fields (name, workingSets, reps, etc.)</li>
                <li>Keep the sets array empty initially</li>
                <li>Set completed to false for all sessions</li>
              </ul>
            </div>
          </section>

          <div className="space-y-3">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Import Program
            </Button>
            <Button onClick={() => setLocation('/')} variant="outline" className="w-full">
              Back to Workouts
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
