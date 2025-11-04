import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus, Send, RefreshCcwDot, ArrowUpFromLine, ArrowDownFromLine, Minimize2, Maximize2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './ui/badge';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useWorkoutProgramContext } from '@/contexts/WorkoutProgramContext';
import { useCoachChatContext } from '@/contexts/CoachChatContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { findSession, findWeek, parseId } from '@/utils/idHelpers';
import { ToolCallPreview, buildToolCallPreview } from '@/components/ToolCallPreview';
import { executeToolCalls } from '@/lib/tools/executor';
import { translateToGUIDs } from '@/lib/tools/translator';
import { stripGUIDs } from '@/utils/guidHelpers';
import { formatCoachMessage } from '@/utils/markdownHelpers';
import type { WorkoutContext } from '@/types/chat';
import type { ToolCall, ToolCallSnapshot } from '@/types/chat';

type CoachAvatarPose =
  | 'default-pose'
  | 'mildly-concerned'
  | 'overhead-press'
  | 'passionately-explaining'
  | 'thinking'
  | 'thumbs-up'
  | 'standing-at-attention';

export const CoachChat = () => {
  const { isOpen: contextIsOpen, openCoach, closeCoach: contextCloseCoach, pendingMessage, clearPendingMessage } = useCoachChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Get workout program data
  const { weeks, updateWeeks } = useWorkoutProgramContext();
  const { profile } = useUserProfile();
  const [location] = useLocation();
  const [isExecutingTools, setIsExecutingTools] = useState(false);

  // Sync context state with local state
  useEffect(() => {
    if (contextIsOpen && !isOpen) {
      handleOpen();
    }
  }, [contextIsOpen, isOpen]);

  // Handle pending messages
  useEffect(() => {
    if (pendingMessage && isOpen) {
      sendChatMessageViaHook(pendingMessage);
      clearPendingMessage();
    }
  }, [pendingMessage, isOpen]);

  // Extract workout context based on current URL
  const workoutContext: WorkoutContext | undefined = useMemo(() => {
    if (!weeks || weeks.length === 0) {
      return undefined;
    }

    // Parse current URL to extract session/week ID
    const pathParts = location.split('/').filter(Boolean);
    const currentId = pathParts[0]; // e.g., "week-1-session-2" or "week-1"

    // Compress profile data - only include non-empty fields
    const userProfile = profile ? {
      ...(profile.name && { name: profile.name }),
      ...(profile.height && { height: profile.height }),
      ...(profile.weight && { weight: profile.weight }),
      ...(profile.notes && { notes: profile.notes }),
    } : undefined;

    if (!currentId) {
      return {
        fullProgram: weeks,
        currentUrl: location,
        ...(userProfile && { userProfile }),
      };
    }

    // Try to find the current session
    const parsed = parseId(currentId);
    let currentSession = parsed?.sessionNumber ? findSession(weeks, currentId) : undefined;
    let currentWeek = parsed?.weekNumber ? findWeek(weeks, currentId) : undefined;

    return {
      currentSession,
      currentWeek,
      fullProgram: weeks,
      currentUrl: location,
      ...(userProfile && { userProfile }),
    };
  }, [weeks, location, profile]);

  // Use chat WebSocket hook for all conversation management
  const {
    conversationHistory,
    isLoading,
    isStreaming,
    streamingMessage,
    error,
    sendMessage: sendChatMessageViaHook,
    resetConversation,
    updateMessage,
  } = useChatWebSocket({
    initialMessage: {
      id: '1',
      role: 'coach',
      content: "Hey there! I'm your workout coach. I can help you modify your training program, answer questions about exercises, and make adjustments based on how you're feeling.",
      timestamp: new Date().toISOString(),
      avatarPose: 'default-pose'
    },
    workoutContext,
  });

  // Filter out system messages from UI display (they're sent to LLM but not shown to user)
  const visibleMessages = conversationHistory.filter(msg => !msg.content.startsWith('[SYSTEM]'));

  const currentMessage = visibleMessages[currentMessageIndex];
  const isViewingHistory = currentMessageIndex < visibleMessages.length - 1;

  // Update current message index when new messages arrive
  // Jump to latest message whenever conversation history grows
  useEffect(() => {
    // Only auto-jump if we're already at the latest message (not viewing history)
    if (!isViewingHistory || currentMessageIndex === visibleMessages.length - 2) {
      setCurrentMessageIndex(visibleMessages.length - 1);
    }
  }, [visibleMessages.length]); // Only trigger when length changes

  // Capture execution snapshots for messages with toolCalls when they arrive
  // This preserves the exact state when the operations were proposed
  useEffect(() => {
    if (!weeks) return;

    conversationHistory.forEach(msg => {
      // If message has tool calls but no execution snapshot yet, capture it
      if (msg.toolCalls && msg.toolCalls.length > 0 && !msg.executionSnapshot) {
        const snapshot: ToolCallSnapshot[] = msg.toolCalls.map(toolCall => {
          const preview = buildToolCallPreview(toolCall, weeks);
          return {
            toolCallId: toolCall.id,
            title: preview.title,
            changes: preview.changes,
          };
        });
        updateMessage(msg.id, { executionSnapshot: snapshot });
      }
    });
  }, [conversationHistory, weeks, updateMessage]); // Run when conversation or weeks change

  // Create a "waiting for coach" placeholder when user sends message
  // This shows immediately before streaming starts
  const isWaitingForCoach = !isViewingHistory &&
    currentMessage &&
    currentMessage.role === 'user' &&
    (isLoading || isStreaming);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before unmounting
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsExpanded(false); // Reset expanded state on close
      // Reset to latest message on close
      setCurrentMessageIndex(visibleMessages.length - 1);
      contextCloseCoach();
    }, 200); // Match animation duration
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
    setIsExpanded(false); // Reset expanded state on open
  };

  const handleBackward = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(currentMessageIndex - 1);
    }
  };

  const handleForward = () => {
    if (currentMessageIndex < visibleMessages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  const canGoBack = currentMessageIndex > 0;
  const canGoForward = currentMessageIndex < visibleMessages.length - 1;

  const handleReplySelect = (reply: string) => {
    setCustomInput('');
    sendChatMessageViaHook(reply);
  };

  const handleSendCustomMessage = () => {
    if (customInput.trim()) {
      sendChatMessageViaHook(customInput);
      setCustomInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCustomMessage();
    }
  };

  const handleConfirmReset = () => {
    setIsConfirmingReset(true);
    setTimeout(() => {
      setIsConfirmingReset(false);
    }, 3000);
  };

  const handleReset = () => {
    resetConversation();
    setCurrentMessageIndex(0);
    setCustomInput('');
    setIsConfirmingReset(false);
  };

  const handleApplyChanges = async (toolCalls: ToolCall[]) => {
    if (!weeks || isExecutingTools) return;

    setIsExecutingTools(true);

    try {
      // Translate index-based tool calls to GUID-based
      // This creates ephemeral GUIDs for deterministic, order-independent execution
      // Note: Execution snapshot was already captured when tool calls arrived (via useEffect)
      const { snapshot, translatedCalls } = translateToGUIDs(toolCalls, weeks);

      // Execute all tool calls atomically on the GUID snapshot
      const result = await executeToolCalls(translatedCalls, snapshot);

      if (result.success) {
        // Strip ephemeral GUIDs from result before saving
        const cleanData = stripGUIDs(result.data);

        // Update workout data in state and localStorage
        updateWeeks(cleanData);

        // Build detailed success message for LLM with parameter details
        const successDetails = result.results
          .map((_r, i) => {
            const toolCall = toolCalls[i];
            if (!toolCall) return 'unknown';

            try {
              const params = JSON.parse(toolCall.function.arguments);
              const toolName = toolCall.function.name;

              // Add context about what was actually changed
              if (toolName === 'add_exercise') {
                return `Added exercise "${params.exercise.name}" to Week ${params.weekNumber} Session ${params.sessionNumber} at position ${params.position}`;
              } else if (toolName === 'modify_exercise') {
                const updates = Object.entries(params.updates).map(([k, v]) => `${k}=${v}`).join(', ');
                return `Modified Week ${params.weekNumber} Session ${params.sessionNumber} Exercise ${params.exerciseNumber}: ${updates}`;
              } else if (toolName === 'remove_exercise') {
                return `Removed exercise ${params.exerciseNumber} from Week ${params.weekNumber} Session ${params.sessionNumber}`;
              } else {
                return `${toolName}: Applied`;
              }
            } catch {
              return `${toolCall.function.name}: Applied`;
            }
          })
          .join('. ');

        // Immediately advance to next message to show coach is thinking
        // This creates the visual feedback before the next message arrives
        // We increment the current index, which will be out of bounds until the new message arrives
        setCurrentMessageIndex(prev => prev + 1);

        // Send confirmation back to LLM (this will be filtered from UI display)
        // This will trigger streaming of the next coach message
        await sendChatMessageViaHook(`[SYSTEM] ${successDetails}. The changes have been successfully applied to the workout program.`);
      } else {
        // Build error message
        const failedTools = result.results
          .filter(r => !r.success)
          .map(r => {
            const toolName = toolCalls.find(tc => tc.id === r.toolCallId)?.function.name || 'unknown';
            const errorMsg = r.errors?.join(', ') || 'Unknown error';
            return `${toolName}: ${errorMsg}`;
          })
          .join('; ');

        // Send error back to LLM
        await sendChatMessageViaHook(`[SYSTEM] Failed to apply changes: ${failedTools}`);
      }
    } catch (error) {
      console.error('[CoachChat] Tool execution error:', error);
      await sendChatMessageViaHook(`[SYSTEM] An error occurred while applying changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecutingTools(false);
    }
  };

  const handleCancelChanges = async () => {
    // User cancelled the proposed changes
    await sendChatMessageViaHook('I changed my mind, please don\'t make those changes.');
  };

  // Determine if coach chat should be visible
  // Show only on workout pages (main app route with week/session ID)
  const shouldShowCoachChat = useMemo(() => {
    // Hide on login, profile, and how-it-works pages
    if (location === '/login' || location === '/profile' || location === '/how-it-works' || location === '/login/callback') {
      return false;
    }
    // Show on root (/) and any week/session routes
    return true;
  }, [location]);

  // Don't render anything if coach chat shouldn't be visible
  if (!shouldShowCoachChat) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border border-gray-350 bg-white backdrop-blur-lg bg-opacity-80 transition-shadow cursor-pointer hover:bg-gray-100"
          size="icon"
          aria-label="Open coach chat"
        >
          <h2 className="text-2xl text-gray-700">?</h2>
        </Button>
      )}

      {/* Dialog Overlay */}
      {isOpen && (
        <>
          {/* Dialog */}
          <div
            className={`border border-gray-300 fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-w-2xl mx-auto flex flex-col transition-[height] duration-300 ease-in-out ${
              isClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            style={{ height: isExpanded ? '90vh' : '50vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              {visibleMessages.length > 1 ? <div className="flex items-center gap-1">
                {/* Navigation Arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackward}
                  disabled={!canGoBack}
                  aria-label="Previous message"
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleForward}
                  disabled={!canGoForward}
                  aria-label="Next message"
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                {/* Page Indicator - only show when viewing history */}
                {isViewingHistory && (
                  <span className="text-xs text-gray-400 px-1">
                    {currentMessageIndex + 1}/{visibleMessages.length}
                  </span>
                )}
              </div> : <div></div>}

              <div className="flex items-center gap-1">
                {isConfirmingReset && (
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-600">New conversation?</p>
                    <Button variant="ghost" size="icon" onClick={handleReset} aria-label="Confirm">
                      <span className="text-sm">OK</span>
                    </Button>
                  </div>
                )}
                {/* Reset button - only show when there are more than just the initial message */}
                {!isConfirmingReset && visibleMessages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConfirmReset}
                    aria-label="Reset conversation"
                    className="h-8 w-8"
                  >
                    <RefreshCcwDot className="h-5 w-5" />
                  </Button>
                )}
                {/* Expand/Shrink button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleExpand}
                  aria-label={isExpanded ? "Shrink chat" : "Expand chat"}
                  className="h-8 w-8"
                >
                  {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close chat"
                  className="h-8 w-8"
                >
                  <Minus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Message Area - JRPG Style */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
                <div className="px-6 py-4">
                  {/* Show waiting/streaming state when loading, or when message is undefined (just advanced index) */}
                  {isWaitingForCoach || !currentMessage ? (
                    <div className="flex items-start gap-4 w-full">
                      <div
                        className="hidden sm:block w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden select-none pointer-events-none"
                        style={{ position: 'relative' }}
                      >
                        <img
                          src="/coach-avatar/thinking.png"
                          alt="Coach avatar"
                          className="w-full h-full object-contain"
                          style={{ display: 'block' }}
                          width={160}
                          height={160}
                        />
                      </div>
                      <div className="gap-2">
                        <Badge variant="outline" className="text-gray-900 mb-2">Coach</Badge>
                        {streamingMessage ? (
                          <p className="text-gray-900 text-md leading-relaxed">
                            {formatCoachMessage(streamingMessage)}
                            <span className="inline-block w-2 h-4 ml-1 bg-gray-900 animate-pulse" />
                          </p>
                        ) : (
                          <div className="py-4">
                            <div className="spinner-loader"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : currentMessage && currentMessage.role === 'coach' ? (
                    <div className="flex items-start gap-4 w-full">
                      <div
                        className="hidden sm:block w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden select-none pointer-events-none"
                        style={{ position: 'relative' }}
                      >
                        <img
                          src={`/coach-avatar/${currentMessage.avatarPose || 'default-pose'}.png`}
                          alt="Coach avatar"
                          className="w-full h-full object-contain"
                          style={{ display: 'block' }}
                          width={160} // md:w-40 = 160px
                          height={160}
                        />
                      </div>
                      <div className="gap-2 flex-1">
                        <Badge variant="outline" className="text-gray-900 mb-2">Coach</Badge>
                        <p className="text-gray-900 text-md leading-relaxed">
                          {formatCoachMessage(currentMessage.content)}
                        </p>

                        {/* Tool Call Preview - Show modifications before user confirms */}
                        {(() => {
                          if (currentMessage.toolCalls && currentMessage.toolCalls.length > 0 && weeks) {
                            return (
                              <ToolCallPreview
                                toolCalls={currentMessage.toolCalls}
                                workoutData={weeks}
                                executionSnapshot={currentMessage.executionSnapshot}
                              />
                            );
                          } else {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  ) : currentMessage ? (
                    <div className="w-full">
                      <Badge variant="outline" className="text-gray-900 mb-2">You</Badge>
                      <p className="text-gray-900 text-md leading-relaxed">
                        {currentMessage.content}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* User Input Area - only shown when at latest message */}
                {!isViewingHistory && currentMessage && currentMessage.role === 'coach' && !isLoading && !isStreaming && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Confirmation Buttons - shown when tool calls are present */}
                    {currentMessage.toolCalls && currentMessage.toolCalls.length > 0 ? (
                      <div className="p-4 pb-2 flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleApplyChanges(currentMessage.toolCalls!)}
                          disabled={isExecutingTools}
                        >
                          {isExecutingTools ? 'Applying...' : 'Apply Changes'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleCancelChanges}
                          disabled={isExecutingTools}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      /* Suggested Replies - shown when no tool calls */
                      currentMessage.suggestedReplies && currentMessage.suggestedReplies.length > 0 && (
                        <div className="p-4 pb-2 flex flex-col gap-2">
                          {currentMessage.suggestedReplies.map((reply, index) => (
                            <Button
                              key={`${currentMessage.id}-${index}`}
                              variant="outline"
                              className="w-full justify-center h-auto py-3 px-4 text-sm font-normal animate-fade-up"
                              style={{
                                animationDelay: `${index * 50}ms`,
                                animationFillMode: 'backwards'
                              }}
                              onClick={() => handleReplySelect(reply)}
                              disabled={isLoading}
                            >
                              {reply}
                            </Button>
                          ))}
                        </div>
                      )
                    )}

                    {/* Custom Text Input - Always visible when at latest coach message */}
                    <div className="p-4 pt-2">
                      <div className="flex gap-2 items-end">
                        <Input
                          type="text"
                          placeholder="Type your message..."
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="flex-1 min-h-[44px]"
                          disabled={isLoading}
                        />
                        <Button
                          size="icon"
                          onClick={handleSendCustomMessage}
                          disabled={!customInput.trim() || isLoading}
                          className="flex-shrink-0 h-11 w-11"
                          aria-label="Send message"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Loading State - removed, now handled by isWaitingForCoach spinner */}
                {/* Error State */}
                {!isViewingHistory && error && (
                  <div className="border-t border-gray-200 p-4 bg-red-50">
                    <div className="text-sm text-red-600 text-center">
                      {error}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </>
      )}
    </>
  );
};
