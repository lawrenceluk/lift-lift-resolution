import { useState } from 'react';
import { Sparkle, X, ChevronLeft, ChevronRight, Minimize2, Maximize2, Minus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './ui/badge';
import { checkHealth } from '@/lib/api';

type CoachAvatarPose =
  | 'default-pose'
  | 'mildly-concerned'
  | 'overhead-press'
  | 'passionately-explaining'
  | 'thinking'
  | 'thumbs-up'
  | 'standing-at-attention';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  avatarPose?: CoachAvatarPose; // Only relevant for coach messages
  suggestedReplies?: string[]; // Only relevant for coach messages
}

export const CoachChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Hardcoded conversation history for Milestone 3
  const conversationHistory: Message[] = [
    {
      id: '1',
      role: 'coach',
      content: "Hey there! I'm your workout coach. I can help you modify your training program, answer questions about exercises, and make adjustments based on how you're feeling.",
      avatarPose: 'default-pose',
      suggestedReplies: ["Let's get started", "Tell me more", "Not right now"]
    },
    {
      id: '2',
      role: 'user',
      content: "How do I do a Romanian Deadlift?"
    },
    {
      id: '3',
      role: 'coach',
      content: "Romanian Deadlifts are great for your hamstrings! Start with feet hip-width apart, holding a barbell. Hinge at the hips while keeping your back straight, lowering the bar down your shins.",
      avatarPose: 'passionately-explaining',
      suggestedReplies: ["Got it, thanks!", "Show me another exercise", "What about form cues?"]
    },
    {
      id: '4',
      role: 'user',
      content: "What if I don't have a barbell?"
    },
    {
      id: '5',
      role: 'coach',
      content: "No problem! You can use dumbbells or kettlebells instead. The movement pattern stays the same - focus on that hip hinge and keeping tension in your hamstrings.",
      avatarPose: 'thumbs-up',
      suggestedReplies: ["Perfect!", "Can you modify my workout?", "What's next?"]
    }
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(conversationHistory.length - 1);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const currentMessage = conversationHistory[currentMessageIndex];
  const isViewingHistory = currentMessageIndex < conversationHistory.length - 1;

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before unmounting
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsMinimized(false); // Reset minimized state on close
      // Reset to latest message on close
      setCurrentMessageIndex(conversationHistory.length - 1);
    }, 200); // Match animation duration
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
    setIsMinimized(false); // Reset minimized state on open
  };

  const handleBackward = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(currentMessageIndex - 1);
    }
  };

  const handleForward = () => {
    if (currentMessageIndex < conversationHistory.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  const canGoBack = currentMessageIndex > 0;
  const canGoForward = currentMessageIndex < conversationHistory.length - 1;

  const handleReplySelect = (reply: string) => {
    setSelectedReply(reply);
    // In future milestones, this will send the message
    console.log('Selected reply:', reply);
    // Clear custom input when selecting a suggested reply
    setCustomInput('');
  };

  const handleSendCustomMessage = () => {
    if (customInput.trim()) {
      console.log('Sending custom message:', customInput);
      // In future milestones, this will send the message
      setCustomInput('');
      setSelectedReply(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCustomMessage();
    }
  };

  // Test health endpoint (M5.1)
  const testHealthEndpoint = async () => {
    try {
      const result = await checkHealth();
      console.log('Health check result:', result);
      alert(`Server is healthy! Timestamp: ${result.timestamp}`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert('Health check failed - check console');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          aria-label="Open coach chat"
        >
          <Sparkle className="h-6 w-6" />
        </Button>
      )}

      {/* Dialog Overlay */}
      {isOpen && (
        <>
          {/* Dialog */}
          <div
            className={`border border-gray-300 fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-w-2xl mx-auto flex flex-col ${
              isClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            style={{ height: isMinimized ? 'auto' : '50vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              {!isMinimized ? <div className="flex items-center gap-1">
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
                {/* Test Health API Button (M5.1 - remove after testing) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testHealthEndpoint}
                  className="text-xs"
                >
                  Test API
                </Button>
              </div> : <div className="text-sm font-bold text-gray-600">Chat with Coach</div>}

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMinimize}
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                >
                  {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Message Area - JRPG Style - only shown when not minimized */}
            {!isMinimized && (
              <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
                <div className="px-6 py-4">
                  {currentMessage.role === 'coach' ? (
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
                      <div className="gap-2">
                        <Badge variant="outline" className="text-gray-900 mb-2">Coach</Badge>
                        <p className="text-gray-900 text-md leading-relaxed">
                          {currentMessage.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <Badge variant="outline" className="text-gray-900 mb-2">You</Badge>
                      <p className="text-gray-900 text-md leading-relaxed">
                        {currentMessage.content}
                      </p>
                    </div>
                  )}
                </div>

                {/* User Input Area - only shown when at latest message */}
                {!isViewingHistory && currentMessage.role === 'coach' && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Suggested Replies */}
                    {currentMessage.suggestedReplies && currentMessage.suggestedReplies.length > 0 && (
                      <div className="p-4 pb-2 flex flex-col gap-2">
                        {currentMessage.suggestedReplies.map((reply, index) => (
                          <Button
                            key={index}
                            variant={selectedReply === reply ? "default" : "outline"}
                            className="w-full justify-center h-auto py-3 px-4 text-sm font-normal"
                            onClick={() => handleReplySelect(reply)}
                          >
                            {reply}
                          </Button>
                        ))}
                      </div>
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
                        />
                        <Button
                          size="icon"
                          onClick={handleSendCustomMessage}
                          disabled={!customInput.trim()}
                          className="flex-shrink-0 h-11 w-11"
                          aria-label="Send message"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {!isViewingHistory && currentMessage.role === 'user' && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm text-gray-400 text-center">
                      Waiting for coach...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};
