import React, { useState } from 'react';
import { Download, Copy, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Week } from '@/types/workout';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeks: Week[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onOpenChange,
  weeks,
}) => {
  const defaultFilename = `workout-program-${new Date().toISOString().split('T')[0]}`;
  const [filename, setFilename] = useState(defaultFilename);
  const [copied, setCopied] = useState(false);

  const jsonData = JSON.stringify(weeks, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Close modal after download
    onOpenChange(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Calculate stats for display
  const totalSessions = weeks.reduce((sum, week) => sum + week.sessions.length, 0);
  const totalExercises = weeks.reduce(
    (sum, week) => sum + week.sessions.reduce(
      (sessionSum, session) => sessionSum + session.exercises.length,
      0
    ),
    0
  );

  // Reset filename when modal opens
  React.useEffect(() => {
    if (open) {
      setFilename(defaultFilename);
      setCopied(false);
    }
  }, [open, defaultFilename]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Workout Program</DialogTitle>
          <DialogDescription>
            Save your workout program as a JSON file or copy it to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Program Stats */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Program Overview</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{weeks.length}</p>
                <p className="text-xs text-gray-600">Weeks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
                <p className="text-xs text-gray-600">Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalExercises}</p>
                <p className="text-xs text-gray-600">Exercises</p>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Download as File</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Enter filename"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  .json
                </span>
              </div>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Copy to Clipboard Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Copy JSON</label>
            <Textarea
              value={jsonData}
              readOnly
              className="font-mono text-xs min-h-[200px] resize-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              onClick={handleCopyToClipboard}
              variant="outline"
              className="w-full gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
