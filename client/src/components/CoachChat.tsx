import { useState } from 'react';
import { Sparkle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';

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
}

export const CoachChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Hardcoded conversation history for Milestone 2.5
  const conversationHistory: Message[] = [
    {
      id: '1',
      role: 'coach',
      content: "Hey there! I'm your workout coach. I can help you modify your training program, answer questions about exercises, and make adjustments based on how you're feeling.",
      avatarPose: 'default-pose'
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
      avatarPose: 'passionately-explaining'
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
      avatarPose: 'thumbs-up'
    }
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(conversationHistory.length - 1);

  const currentMessage = conversationHistory[currentMessageIndex];
  const isViewingHistory = currentMessageIndex < conversationHistory.length - 1;

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before unmounting
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      // Reset to latest message on close
      setCurrentMessageIndex(conversationHistory.length - 1);
    }, 200); // Match animation duration
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
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
            className={`border border-gray-300 fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-w-2xl mx-auto ${
              isClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
            style={{ height: '40vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-1">
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
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Message Area - JRPG Style */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 flex items-center px-6 py-2">
                {currentMessage.role === 'coach' ? (
                  <div className="flex items-start gap-4 w-full">
                    <img
                      src={`/coach-avatar/${currentMessage.avatarPose || 'default-pose'}.png`}
                      alt="Coach avatar"
                      className="hidden sm:block w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 select-none pointer-events-none"
                    />
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
              {!isViewingHistory && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-400 text-center">
                    Reply options will appear here
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
