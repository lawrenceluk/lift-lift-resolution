import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useProgramLibrary } from '@/hooks/useProgramLibrary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatCoachMessage } from '@/utils/markdownHelpers';
import type { QuestionnaireData } from '@/types/programBuilder';
import type { Message } from '@/types/chat';
import type { Week } from '@/types/workout';

export const ProgramBuilderPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { createProgram } = useProgramLibrary();
  const [input, setInput] = useState('');
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse questionnaire data from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const questionnaireJson = searchParams.get('q');
  const questionnaire: QuestionnaireData | null = questionnaireJson
    ? JSON.parse(questionnaireJson)
    : null;

  // Redirect if not logged in or no questionnaire data
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login?returnTo=/builder');
    }
    if (!authLoading && !questionnaireJson) {
      setLocation('/library/new');
    }
  }, [user, authLoading, questionnaireJson, setLocation]);

  // Build context for program builder
  const programBuilderContext = questionnaire
    ? {
        programBuilder: true,
        preferences: questionnaire,
      }
    : undefined;

  // Use chat WebSocket with program builder context
  const {
    conversationHistory,
    isLoading,
    isStreaming,
    streamingMessage,
    error,
    isWebSocketConnected,
    sendMessage,
  } = useChatWebSocket({
    workoutContext: programBuilderContext as any,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, streamingMessage]);

  // Watch for JSON program in messages and create it
  useEffect(() => {
    if (isCreatingProgram) return; // Already creating

    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (!lastMessage || lastMessage.role !== 'coach') return;

    // Look for JSON code block in message
    const jsonMatch = lastMessage.content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) return;

    try {
      const weeks = JSON.parse(jsonMatch[1]) as Week[];

      // Validate it's an array of weeks
      if (!Array.isArray(weeks) || weeks.length === 0) return;
      if (!weeks[0].weekNumber || !weeks[0].sessions) return;

      // Create the program!
      setIsCreatingProgram(true);
      createProgram(undefined, weeks)
        .then(() => {
          // Redirect handled by createProgram (it calls selectProgram)
          setLocation('/');
        })
        .catch((error) => {
          console.error('Failed to create program:', error);
          setIsCreatingProgram(false);
        });
    } catch (error) {
      // Not valid JSON or not a program, ignore
      console.log('No valid program JSON found in message');
    }
  }, [conversationHistory, isCreatingProgram, createProgram, setLocation]);

  // Send initial message when WebSocket connects
  useEffect(() => {
    if (
      questionnaire &&
      conversationHistory.length === 0 &&
      !isLoading &&
      isWebSocketConnected // Wait for WebSocket to connect
    ) {
      const initialMessage = `I'd like to create a ${questionnaire.duration}-week ${questionnaire.goal} program. I can train ${questionnaire.sessionsPerWeek} days per week, I'm ${questionnaire.experience} level, and I have access to ${questionnaire.equipment}.${questionnaire.notes ? ` Additional notes: ${questionnaire.notes}` : ''}`;
      sendMessage(initialMessage);
    }
  }, [questionnaire, conversationHistory.length, isLoading, isWebSocketConnected]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageToSend = input.trim();
    setInput('');
    await sendMessage(messageToSend);
  };

  // Show loading while checking auth
  if (authLoading || !user || !questionnaire) {
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
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/library')}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Building Your Program</h1>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Show connection status while waiting */}
          {!isWebSocketConnected && conversationHistory.length === 0 && (
            <div className="flex justify-center">
              <div className="rounded-lg px-4 py-3 bg-gray-100 border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </div>
              </div>
            </div>
          )}

          {conversationHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {message.role === 'coach' ? (
                  <div className="prose prose-sm max-w-none">
                    {formatCoachMessage(message.content)}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-3 bg-white border border-gray-200 text-gray-900">
                <div className="prose prose-sm max-w-none">
                  {formatCoachMessage(streamingMessage)}
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator for tool execution */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-3 bg-white border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-800">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe changes you'd like to make..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
};
