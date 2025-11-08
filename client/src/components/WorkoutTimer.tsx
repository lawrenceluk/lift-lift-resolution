import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutTimerContext } from '@/contexts/WorkoutTimerContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type TimerMode = 'stopwatch' | 'countdown';

export const WorkoutTimer = () => {
  const { isOpen, closeTimer } = useWorkoutTimerContext();
  const [isClosing, setIsClosing] = useState(false);
  const [mode, setMode] = useState<TimerMode>('stopwatch');

  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown state
  const [countdownTime, setCountdownTime] = useState(0);
  const [countdownInputMinutes, setCountdownInputMinutes] = useState<number | ''>(3);
  const [countdownInputSeconds, setCountdownInputSeconds] = useState<number | ''>(0);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stopwatch logic
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [isStopwatchRunning]);

  // Countdown logic
  useEffect(() => {
    if (isCountdownRunning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 10) {
            setIsCountdownRunning(false);
            // Play sound or vibrate here if desired
            return 0;
          }
          return prev - 10;
        });
      }, 10);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isCountdownRunning]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      closeTimer();
    }, 200);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleStopwatchStartPause = () => {
    setIsStopwatchRunning(!isStopwatchRunning);
  };

  const handleStopwatchReset = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (isStopwatchRunning) {
      setLaps(prev => [stopwatchTime, ...prev]);
    }
  };

  const handleCountdownStartPause = () => {
    if (!isCountdownRunning && countdownTime === 0) {
      // Set initial time from inputs (treat empty as 0)
      const minutes = countdownInputMinutes === '' ? 0 : countdownInputMinutes;
      const seconds = countdownInputSeconds === '' ? 0 : countdownInputSeconds;
      setCountdownTime((minutes * 60 + seconds) * 1000);
    }
    setIsCountdownRunning(!isCountdownRunning);
  };

  const handleCountdownReset = () => {
    setIsCountdownRunning(false);
    setCountdownTime(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 bg-white border-b border-gray-300 shadow-lg z-50 max-w-2xl mx-auto transition-transform duration-200 ease-in-out ${
        isClosing ? 'animate-slide-up-to-top' : 'animate-slide-down-from-top'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Workout Timer</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close timer"
            className="h-8 w-8"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as TimerMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
            <TabsTrigger value="countdown">Timer</TabsTrigger>
          </TabsList>

          {/* Stopwatch Mode */}
          <TabsContent value="stopwatch" className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold text-gray-900 mb-6">
                {formatTime(stopwatchTime)}
              </div>

              <div className="flex gap-3 justify-center mb-4">
                {isStopwatchRunning ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleStopwatchStartPause}
                    className="w-full max-w-[290px]"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleStopwatchStartPause}
                      className="flex-1 max-w-[140px]"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {stopwatchTime > 0 ? 'Resume' : 'Start'}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleStopwatchReset}
                      className="flex-1 max-w-[140px]"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Reset
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleLap}
                disabled={!isStopwatchRunning}
                className="w-full max-w-[290px]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Lap
              </Button>

              {/* Laps */}
              {laps.length > 0 && (
                <div className="mt-4 max-h-32 overflow-y-auto">
                  <div className="text-sm font-semibold text-gray-600 mb-2">Laps</div>
                  {laps.map((lap, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-700 py-1 border-b border-gray-100">
                      <span>Lap {laps.length - index}</span>
                      <span className="font-mono">{formatTime(lap)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Countdown Mode */}
          <TabsContent value="countdown" className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold text-gray-900 mb-6">
                {formatTime(countdownTime)}
              </div>

              {/* Time Input */}
              {!isCountdownRunning && countdownTime === 0 && (
                <div className="flex gap-2 justify-center mb-4">
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-gray-600 mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={countdownInputMinutes === '' ? '' : countdownInputMinutes}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setCountdownInputMinutes('');
                        } else {
                          const num = parseInt(val);
                          setCountdownInputMinutes(isNaN(num) ? '' : num);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 0) {
                          setCountdownInputMinutes(0);
                        } else if (val > 59) {
                          setCountdownInputMinutes(59);
                        }
                      }}
                      className="w-20 h-12 text-center text-2xl font-mono border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-end pb-3 text-2xl font-bold text-gray-400">:</div>
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-gray-600 mb-1">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={countdownInputSeconds === '' ? '' : countdownInputSeconds}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setCountdownInputSeconds('');
                        } else {
                          const num = parseInt(val);
                          setCountdownInputSeconds(isNaN(num) ? '' : num);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 0) {
                          setCountdownInputSeconds(0);
                        } else if (val > 59) {
                          setCountdownInputSeconds(59);
                        }
                      }}
                      className="w-20 h-12 text-center text-2xl font-mono border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {isCountdownRunning ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCountdownStartPause}
                    className="w-full max-w-[290px]"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleCountdownStartPause}
                      disabled={(countdownInputMinutes === 0 || countdownInputMinutes === '') && (countdownInputSeconds === 0 || countdownInputSeconds === '') && countdownTime === 0}
                      className="flex-1 max-w-[140px]"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {countdownTime > 0 ? 'Resume' : 'Start'}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleCountdownReset}
                      className="flex-1 max-w-[140px]"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Reset
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
