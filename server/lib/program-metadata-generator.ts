/**
 * AI-powered program metadata generator
 * Analyzes workout program structure and generates smart names and descriptions
 */

interface Week {
  sessions: Session[];
  phase?: string;
  [key: string]: any;
}

interface Session {
  name: string;
  exercises: Exercise[];
  [key: string]: any;
}

interface Exercise {
  name: string;
  [key: string]: any;
}

interface ProgramMetadata {
  name: string;
  description: string;
}

/**
 * Analyzes workout program structure and generates AI-powered name and description
 * Throws error if LLM is unavailable - no fallback
 */
export async function generateProgramMetadata(weeks: Week[]): Promise<ProgramMetadata> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Extract key program features for analysis
  const analysis = analyzeProgramStructure(weeks);

  const prompt = `Analyze this workout program and generate:
1. A concise, descriptive program name (max 50 characters)
2. A brief description (2-3 sentences, max 200 characters)

Program Analysis:
- ${analysis.weekCount} weeks
- ${analysis.sessionsPerWeek} sessions per week
- Training phases: ${analysis.phases.join(', ') || 'None specified'}
- Main exercises: ${analysis.mainExercises.slice(0, 8).join(', ')}
- Session types: ${analysis.sessionTypes.join(', ')}

Guidelines:
- Name should be professional and descriptive (e.g., "4-Day Upper/Lower Split", "Strength Cycle - SBD Focus")
- Description should highlight program structure, focus areas, and training style
- Be specific about the split type if evident (Push/Pull/Legs, Upper/Lower, Full Body, etc.)
- Avoid generic names like "Training Program" or "Workout Plan"

Respond ONLY with valid JSON in this exact format:
{"name": "Program Name Here", "description": "Brief description here."}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://workout-tracker.example.com',
      'X-Title': 'Workout Coach'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in AI response');
  }

  // Parse JSON response
  const metadata = JSON.parse(content.trim()) as ProgramMetadata;

  // Validate response
  if (!metadata.name || !metadata.description) {
    throw new Error('Invalid metadata structure from AI');
  }

  console.log('[Program Metadata] Generated:', metadata);
  return metadata;
}

/**
 * Analyzes program structure to extract key features
 */
function analyzeProgramStructure(weeks: Week[]) {
  const weekCount = weeks.length;
  const phaseSet = new Set<string>();
  weeks.forEach(w => {
    if (w.phase) phaseSet.add(w.phase);
  });
  const phases = Array.from(phaseSet);

  // Calculate average sessions per week
  const totalSessions = weeks.reduce((sum, week) => sum + week.sessions.length, 0);
  const sessionsPerWeek = Math.round(totalSessions / weekCount);

  // Extract all unique exercises
  const allExercises: string[] = [];
  const sessionTypes: Set<string> = new Set();

  weeks.forEach(week => {
    week.sessions.forEach(session => {
      sessionTypes.add(session.name);
      session.exercises.forEach(ex => {
        allExercises.push(ex.name);
      });
    });
  });

  // Count exercise frequency and get top exercises
  const exerciseCounts = allExercises.reduce((counts, name) => {
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const mainExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 10);

  return {
    weekCount,
    sessionsPerWeek,
    phases,
    mainExercises,
    sessionTypes: Array.from(sessionTypes),
  };
}

