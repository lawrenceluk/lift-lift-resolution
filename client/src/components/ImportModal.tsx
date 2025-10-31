import React, { useState, useCallback } from 'react';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Week } from '@/types/workout';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (weeks: Week[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);

  const validateAndImport = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);

      // Basic validation - check if it's an array of weeks
      if (!Array.isArray(parsed)) {
        setValidationError('Invalid format: Expected an array of weeks');
        setValidationSuccess(false);
        return;
      }

      // Check for required week properties
      for (const week of parsed) {
        if (!week.id || !week.weekNumber || !week.sessions) {
          setValidationError('Invalid format: Each week must have id, weekNumber, and sessions');
          setValidationSuccess(false);
          return;
        }
      }

      setValidationError(null);
      setValidationSuccess(true);
      onImport(parsed as Week[]);
      onOpenChange(false);

      // Reset state
      setTimeout(() => {
        setJsonText('');
        setValidationSuccess(false);
      }, 300);
    } catch (error) {
      setValidationError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setValidationSuccess(false);
    }
  }, [onImport, onOpenChange]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      validateAndImport(text);
    };
    reader.readAsText(file);
  }, [validateAndImport]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const handleJsonPaste = useCallback(() => {
    if (!jsonText.trim()) {
      setValidationError('Please paste JSON content');
      return;
    }
    validateAndImport(jsonText);
  }, [jsonText, validateAndImport]);

  const handleValidateOnly = useCallback(() => {
    if (!jsonText.trim()) {
      setValidationError('Please paste JSON content');
      setValidationSuccess(false);
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        setValidationError('Invalid format: Expected an array of weeks');
        setValidationSuccess(false);
        return;
      }

      for (const week of parsed) {
        if (!week.id || !week.weekNumber || !week.sessions) {
          setValidationError('Invalid format: Each week must have id, weekNumber, and sessions');
          setValidationSuccess(false);
          return;
        }
      }

      setValidationError(null);
      setValidationSuccess(true);
    } catch (error) {
      setValidationError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setValidationSuccess(false);
    }
  }, [jsonText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Workout Program</DialogTitle>
          <DialogDescription>
            Import a workout program from a JSON file or paste JSON directly.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Warning:</strong> Importing will overwrite your current workout program. Make sure to export your current program first if you want to keep it.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="json">Paste JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }
              `}
            >
              <input
                type="file"
                accept="application/json"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className={`w-12 h-12 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {dragActive ? 'Drop file here' : 'Drag and drop your JSON file here'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste JSON</label>
              <Textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setValidationError(null);
                  setValidationSuccess(false);
                }}
                placeholder='Paste your workout program JSON here...'
                className="font-mono text-sm min-h-[200px]"
              />
            </div>

            {validationError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}

            {validationSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  JSON is valid! Ready to import.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleValidateOnly}
                variant="outline"
                className="flex-1"
                disabled={!jsonText.trim()}
              >
                Validate JSON
              </Button>
              <Button
                onClick={handleJsonPaste}
                className="flex-1"
                disabled={!jsonText.trim()}
              >
                Import Program
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
