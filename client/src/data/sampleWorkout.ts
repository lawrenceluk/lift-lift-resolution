import { WorkoutProgram } from '@/types/workout';

export const createSampleProgram = (): WorkoutProgram => ({
  id: 'program-1',
  name: 'Foundation Training Program',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  weeks: [
    {
      id: 'week-1',
      number: 1,
      phase: 'Foundation',
      startDate: '2024-10-19',
      endDate: '2024-10-25',
      description: 'Easing back in - should feel manageable, not exhausting',
      sessions: [
        {
          id: 'session-1',
          title: 'Lower Heavy',
          day: 'Sunday',
          date: '2024-10-19',
          completed: false,
          exercises: [
            {
              id: 'ex-1',
              name: 'Barbell Squat',
              completed: false,
              sets: [
                {
                  id: 'set-1-1',
                  prescribed: { reps: 8, weight: 185, rir: 2, notes: 'Warm-up set' },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-1-2',
                  prescribed: { reps: 8, weight: 225, rir: 2 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-1-3',
                  prescribed: { reps: 8, weight: 225, rir: 2 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-1-4',
                  prescribed: { reps: 8, weight: 225, rir: 2 },
                  actual: {},
                  completed: false,
                },
              ],
            },
            {
              id: 'ex-2',
              name: 'Romanian Deadlift',
              completed: false,
              sets: [
                {
                  id: 'set-2-1',
                  prescribed: { reps: 10, weight: 135, rir: 3 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-2-2',
                  prescribed: { reps: 10, weight: 155, rir: 3 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-2-3',
                  prescribed: { reps: 10, weight: 155, rir: 3 },
                  actual: {},
                  completed: false,
                },
              ],
            },
          ],
        },
        {
          id: 'session-2',
          title: 'Upper + Cardio',
          day: 'Tuesday',
          date: '2024-10-21',
          completed: false,
          cardio: {
            duration: 35,
            type: 'Incline walk',
            notes: 'Zone 2 heart rate',
          },
          exercises: [
            {
              id: 'ex-3',
              name: 'Bench Press',
              completed: false,
              sets: [
                {
                  id: 'set-3-1',
                  prescribed: { reps: 8, weight: 135, rir: 2 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-3-2',
                  prescribed: { reps: 8, weight: 155, rir: 2 },
                  actual: {},
                  completed: false,
                },
                {
                  id: 'set-3-3',
                  prescribed: { reps: 8, weight: 155, rir: 2 },
                  actual: {},
                  completed: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
