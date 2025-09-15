import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle,
  AlertCircle,
  CloudUpload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  uploading: boolean;
  onRemoveFile: () => void;
  className?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  selectedFile,
  uploading,
  onRemoveFile,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PDF or Word document (.pdf, .doc, .docx)';
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setDragError(error);
      return;
    }
    
    setDragError(null);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Drag and Drop Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragOver 
            ? "border-primary bg-primary/5 scale-105" 
            : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 cursor-not-allowed",
          dragError && "border-red-300 bg-red-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Upload Icon */}
            <div className={cn(
              "p-4 rounded-full transition-all duration-200",
              isDragOver 
                ? "bg-primary/10 scale-110" 
                : "bg-gray-100",
              dragError && "bg-red-100"
            )}>
              {dragError ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : (
                <CloudUpload className={cn(
                  "h-8 w-8 transition-colors duration-200",
                  isDragOver ? "text-primary" : "text-gray-500"
                )} />
              )}
            </div>

            {/* Upload Text */}
            <div className="text-center space-y-2">
              <h3 className={cn(
                "text-lg font-semibold transition-colors duration-200",
                isDragOver ? "text-primary" : "text-gray-700",
                dragError && "text-red-700"
              )}>
                {dragError ? "Invalid File" : isDragOver ? "Drop your resume here" : "Upload your resume"}
              </h3>
              
              <p className={cn(
                "text-sm transition-colors duration-200",
                isDragOver ? "text-primary/80" : "text-gray-500",
                dragError && "text-red-600"
              )}>
                {dragError ? dragError : "Drag and drop your file here, or click to browse"}
              </p>
            </div>

            {/* File Format Info */}
            {!dragError && (
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3" />
                  <span>PDF, DOC, DOCX</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Upload className="h-3 w-3" />
                  <span>Max 5MB</span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {!uploading && (
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected File Display */}
      {selectedFile && !dragError && (
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile.name)}
                <div>
                  <p className="font-medium text-green-800">{selectedFile.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {formatFileSize(selectedFile.size)}
                    </Badge>
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">Ready to upload</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploading State */}
      {uploading && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-blue-800 font-medium">Uploading resume...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DragDropUpload;
