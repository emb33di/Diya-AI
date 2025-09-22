import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Download, 
  Eye, 
  X, 
  Maximize2, 
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResumePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData?: any;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ 
  isOpen, 
  onClose, 
  resumeData 
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const { toast } = useToast();

  // Load resume preview HTML when component opens
  useEffect(() => {
    if (isOpen) {
      loadResumePreview();
    }
  }, [isOpen]);

  const loadResumePreview = async () => {
    setLoading(true);
    console.log('🔄 Starting resume preview load...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session check:', session ? 'Found' : 'Not found');
      
      if (!session) {
        console.log('❌ No session found');
        toast({
          title: "Authentication required",
          description: "Please log in to preview your resume.",
          variant: "destructive"
        });
        return;
      }

      console.log('📡 Making request to /functions/v1/preview-resume');
      const response = await fetch('/functions/v1/preview-resume', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'text/html'
        }
      });
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const html = await response.text();
        console.log('✅ HTML received, length:', html.length);
        console.log('📄 HTML content preview:', html.substring(0, 500) + '...');
        setHtmlContent(html);
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
        throw new Error(`Failed to generate preview: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('💥 Preview error:', error);
      toast({
        title: "Preview failed",
        description: `Failed to generate resume preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('🏁 Preview load completed');
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to download your resume.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/functions/v1/download-resume', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: "PDF file is being downloaded.",
        });
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the resume file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-none w-screen h-screen' : 'max-w-6xl max-h-[90vh]'} overflow-hidden`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col space-y-1">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Resume Preview & PDF Download</span>
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Preview your resume before downloading to save on generation costs
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustZoom(-10)}
                disabled={zoom <= 50}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium min-w-[3rem] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustZoom(10)}
                disabled={zoom >= 200}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Download Button */}
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4" />
              <span>{downloadLoading ? 'Generating PDF...' : 'Download PDF'}</span>
            </Button>

            {/* Close Button */}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating resume preview...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              {/* Google PDF Viewer Style Container */}
              <div className="min-h-full bg-gray-100 py-8">
                <div className="max-w-5xl mx-auto px-4">
                  {/* PDF Viewer Header */}
                  <div className="bg-white border border-gray-200 rounded-t-lg shadow-sm">
                    <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-700">resume.pdf</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>1 page</span>
                          <span>•</span>
                          <span>A4</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Last modified: Today</span>
                      </div>
                    </div>

                    {/* Document Container */}
                    <div className="bg-gray-100 p-8">
                      <div 
                        className="mx-auto bg-white shadow-lg border border-gray-200"
                        style={{
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: 'top center',
                          transition: 'transform 0.2s ease-in-out',
                          width: '210mm',
                          minHeight: '297mm',
                          maxHeight: '297mm',
                          padding: '20mm',
                          boxSizing: 'border-box'
                        }}
                      >
                        {htmlContent ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                            className="h-full overflow-hidden"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No resume content available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PDF Viewer Footer */}
                    <div className="bg-gray-50 border-t px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Zoom: {zoom}%</span>
                        <span>•</span>
                        <span>A4 Format (210 × 297 mm)</span>
                        <span>•</span>
                        <span>Ready to print</span>
                        <span>•</span>
                        <span className="text-green-600 font-medium">Preview-first design saves costs</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustZoom(-10)}
                          disabled={zoom <= 50}
                          className="h-7 w-7 p-0 hover:bg-gray-200"
                        >
                          <ZoomOut className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium min-w-[2.5rem] text-center px-2">
                          {zoom}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustZoom(10)}
                          disabled={zoom >= 200}
                          className="h-7 w-7 p-0 hover:bg-gray-200"
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetZoom}
                          className="h-7 px-2 text-xs hover:bg-gray-200"
                        >
                          Fit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResumePreview;
