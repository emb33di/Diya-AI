import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  Eye, 
  X, 
  Maximize2, 
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileText,
  FileDown,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateDocxFromResumeData } from '@/utils/docxGenerator';

interface ResumePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData?: any;
  userProfile?: {
    full_name?: string;
    email_address?: string;
    phone_number?: string;
  };
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ 
  isOpen, 
  onClose, 
  resumeData,
  userProfile 
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const { toast } = useToast();

  // Load resume preview HTML when component opens
  useEffect(() => {
    if (isOpen) {
      loadResumePreview();
    }
  }, [isOpen, resumeData]);

  const loadResumePreview = async () => {
    setLoading(true);
    console.log('🔄 Starting resume preview load...');
    
    try {
      // Check if we have local resume data first
      if (resumeData && Object.values(resumeData).some(activities => activities.length > 0)) {
        console.log('📄 Using local resume data for preview');
        const html = generateResumeHtmlFromData(resumeData);
        setHtmlContent(html);
        return;
      }

      // Fall back to API call if no local data
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

  // DOCX generation and download
  const handleDownloadDOCX = async () => {
    try {
      if (!resumeData || Object.values(resumeData).every(activities => activities.length === 0)) {
        toast({
          title: "No resume data",
          description: "Please add some resume activities before downloading.",
          variant: "destructive"
        });
        return;
      }

      await generateDocxFromResumeData(resumeData, userProfile || {});
      
      toast({
        title: "DOCX Download Started",
        description: "Your resume is being downloaded as a Word document.",
      });
    } catch (error) {
      console.error('DOCX generation error:', error);
      toast({
        title: "DOCX generation failed",
        description: "Failed to generate DOCX document. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Primary PDF generation using browser print (reliable and cost-effective)
  const handleDownloadPDF = () => {
    try {
      // Generate HTML content from local data
      const htmlContent = generateResumeHtmlFromData(resumeData);
      
      // Create a new window with the HTML content and exact preview styling
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Resume</title>
            <style>
              .resume-page {
                background-color: #ffffff;
                font-family: "Times New Roman", Times, serif;
                font-size: 12pt;
                line-height: 1.4;
                color: #000000;
                width: 100%;
                max-width: 8.5in;
                min-height: 11in;
                padding: 0.5in;
                margin: 0 auto;
                box-sizing: border-box;
              }

              .resume-page .header {
                text-align: center;
                margin-bottom: 24px;
              }

              .resume-page .header .name {
                font-size: 22pt;
                font-weight: bold;
                margin: 0;
                color: #000000;
              }

              .resume-page .header .contact-info {
                font-size: 11pt;
                margin-top: 4px;
                color: #000000;
              }

              .resume-page .section {
                margin-bottom: 16px;
              }

              .resume-page .section-title {
                font-size: 13pt;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #333;
                padding-bottom: 4px;
                margin-bottom: 10px;
                color: #000000;
              }

              .resume-page .entry {
                margin-bottom: 12px;
              }

              .resume-page .entry-title {
                font-weight: bold;
                color: #000000;
              }
              
              .resume-page .entry-position-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
              }
              
              .resume-page .entry-position {
                font-style: italic;
                margin-top: 1px;
                color: #000000;
              }

              .resume-page .entry-dates {
                font-style: italic;
                color: #333333;
                flex-shrink: 0;
                padding-left: 15px;
              }

              .resume-page .entry-bullets {
                padding-left: 20px;
                margin-top: 4px;
                margin-bottom: 0;
                list-style-type: disc;
              }

              .resume-page .entry-bullets li {
                margin-bottom: 4px;
                color: #000000;
              }
              
              .resume-page .simple-list-section p {
                margin: 0 0 4px 0;
                color: #000000;
              }

              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                
                .resume-page {
                  width: 8.5in;
                  height: 11in;
                  margin: 0;
                  padding: 0.5in;
                  box-shadow: none;
                }
                
                .resume-page .section {
                  page-break-inside: avoid;
                }
                
                .resume-page .entry {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
        
        toast({
          title: "Print Dialog Opened",
          description: "Select 'Save as PDF' in your browser's print dialog for a perfect copy.",
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF generation failed",
        description: "Failed to open print dialog. Please try again.",
        variant: "destructive"
      });
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


  // Generate HTML from local resume data
  const generateResumeHtmlFromData = (data: any) => {
    const { academic, experience, projects, extracurricular, volunteering, skills, interests, languages } = data;
    
    // Debug logging to see what's in the data
    console.log('🔍 ResumePreview Debug - Full data:', data);
    console.log('🔍 ResumePreview Debug - Languages:', languages);
    console.log('🔍 ResumePreview Debug - Skills:', skills);
    console.log('🔍 ResumePreview Debug - Interests:', interests);

    // Format date range
    const formatDateRange = (fromDate: string, toDate: string, isCurrent: boolean) => {
      if (!fromDate && !toDate) return '';
      const from = fromDate || '';
      const to = isCurrent ? 'Present' : (toDate || '');
      return from && to ? `${from} – ${to}` : (from || to);
    };

    // Generate personal info section
    const userName = userProfile?.full_name || 'Resume';
    const contactInfo = [
      userProfile?.phone_number,
      userProfile?.email_address
    ].filter(Boolean).join(' | ');
    
    const personalInfoHtml = `
      <header class="header">
        <h1 class="name">${userName}</h1>
        ${contactInfo ? `<p class="contact-info">${contactInfo}</p>` : ''}
      </header>
    `;

    // Generate academic section
    const academicHtml = academic && academic.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Education</h2>
        ${academic.map((item: any) => `
          <div class="entry">
            <div class="entry-title">${item.title || ''}</div>
            ${item.position ? `
              <div class="entry-position-header">
                <span class="entry-position">${item.position}</span>
                ${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false) ? `
                  <span class="entry-dates">${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false)}</span>
                ` : ''}
              </div>
            ` : ''}
            ${item.bullets && item.bullets.length > 0 ? `
              <ul class="entry-bullets">
                ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Generate experience section
    const experienceHtml = experience && experience.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Experience</h2>
        ${experience.map((item: any) => `
          <div class="entry">
            <div class="entry-title">${item.title || ''}</div>
            ${item.position ? `
              <div class="entry-position-header">
                <span class="entry-position">${item.position}</span>
                ${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false) ? `
                  <span class="entry-dates">${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false)}</span>
                ` : ''}
              </div>
            ` : ''}
            ${item.bullets && item.bullets.length > 0 ? `
              <ul class="entry-bullets">
                ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Generate projects section
    const projectsHtml = projects && projects.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Projects</h2>
        ${projects.map((item: any) => `
          <div class="entry">
            <div class="entry-title">${item.title || ''}</div>
            ${item.position ? `
              <div class="entry-position-header">
                <span class="entry-position">${item.position}</span>
                ${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false) ? `
                  <span class="entry-dates">${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false)}</span>
                ` : ''}
              </div>
            ` : ''}
            ${item.bullets && item.bullets.length > 0 ? `
              <ul class="entry-bullets">
                ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Generate extracurricular section
    const extracurricularHtml = extracurricular && extracurricular.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Extracurriculars</h2>
        ${extracurricular.map((item: any) => `
          <div class="entry">
            <div class="entry-title">${item.title || ''}</div>
            ${item.position ? `
              <div class="entry-position-header">
                <span class="entry-position">${item.position}</span>
                ${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false) ? `
                  <span class="entry-dates">${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false)}</span>
                ` : ''}
              </div>
            ` : ''}
            ${item.bullets && item.bullets.length > 0 ? `
              <ul class="entry-bullets">
                ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Generate volunteering section
    const volunteeringHtml = volunteering && volunteering.length > 0 ? `
      <section class="section">
        <h2 class="section-title">Volunteering</h2>
        ${volunteering.map((item: any) => `
          <div class="entry">
            <div class="entry-title">${item.title || ''}</div>
            ${item.position ? `
              <div class="entry-position-header">
                <span class="entry-position">${item.position}</span>
                ${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false) ? `
                  <span class="entry-dates">${formatDateRange(item.fromDate || '', item.toDate || '', item.isCurrent || false)}</span>
                ` : ''}
              </div>
            ` : ''}
            ${item.bullets && item.bullets.length > 0 ? `
              <ul class="entry-bullets">
                ${item.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Generate combined skills and interests section
    const skillsAndInterestsHtml = (skills && skills.length > 0) || (interests && interests.length > 0) || (languages && languages.length > 0) ? `
      <section class="section simple-list-section">
        <h2 class="section-title">Skills and Interests</h2>
        ${skills && skills.length > 0 ? `
          <p><strong>Skills:</strong> ${skills.map((item: any) => 
            item.bullets && item.bullets.length > 0 ? item.bullets.join(', ') : (item.title || '')
          ).join(', ')}</p>
        ` : ''}
        ${languages && languages.length > 0 ? `
          <p><strong>Languages:</strong> ${languages.map((item: any) => {
            // Handle different possible data structures
            if (item.title) {
              return item.title;
            } else if (item.language) {
              // Handle structured language data with proficiency
              return item.proficiency ? `${item.language} (${item.proficiency})` : item.language;
            } else if (typeof item === 'string') {
              return item;
            } else if (item.bullets && item.bullets.length > 0) {
              return item.bullets.join(', ');
            }
            return '';
          }).filter(Boolean).join(', ')}</p>
        ` : ''}
        ${interests && interests.length > 0 ? `
          <p><strong>Interests:</strong> ${interests.map((item: any) => item.title || '').join(', ')}</p>
        ` : ''}
      </section>
    ` : '';

    // Check if there's any data to display
    const hasAnyData = academic.length > 0 || experience.length > 0 || projects.length > 0 || 
                       extracurricular.length > 0 || volunteering.length > 0 || skills.length > 0 || 
                       interests.length > 0 || languages.length > 0;

    return `
      <div class="resume-page">
        ${personalInfoHtml}
        ${hasAnyData ? `
          ${academicHtml}
          ${experienceHtml}
          ${projectsHtml}
          ${extracurricularHtml}
          ${volunteeringHtml}
          ${skillsAndInterestsHtml}
        ` : `
          <section class="section">
            <h2 class="section-title">No Resume Data</h2>
            <p>Please add some resume activities using the "Add Activity" dropdown above to see your resume preview.</p>
            <p>You can add education, experience, projects, and other sections to build your resume.</p>
          </section>
        `}
      </div>
    `;
  };

  return (
    <>
      {/* Resume-specific styles */}
      <style>{`
        .resume-page {
          background-color: #ffffff;
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.4;
          color: #000000;
          width: 100%;
          max-width: 8.5in;
          min-height: 11in;
          padding: 0.5in;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .resume-page .header {
          text-align: center;
          margin-bottom: 24px;
        }

        .resume-page .header .name {
          font-size: 22pt;
          font-weight: bold;
          margin: 0;
          color: #000000;
        }

        .resume-page .header .contact-info {
          font-size: 11pt;
          margin-top: 4px;
          color: #000000;
        }

        .resume-page .section {
          margin-bottom: 16px;
        }

        .resume-page .section-title {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #333;
          padding-bottom: 4px;
          margin-bottom: 10px;
          color: #000000;
        }

        .resume-page .entry {
          margin-bottom: 12px;
        }

        .resume-page .entry-title {
          font-weight: bold;
          color: #000000;
        }
        
        .resume-page .entry-position-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        
        .resume-page .entry-position {
          font-style: italic;
          margin-top: 1px;
          color: #000000;
        }

        .resume-page .entry-dates {
          font-style: italic;
          color: #333333;
          flex-shrink: 0;
          padding-left: 15px;
        }

        .resume-page .entry-bullets {
          padding-left: 20px;
          margin-top: 4px;
          margin-bottom: 0;
          list-style-type: disc;
        }

        .resume-page .entry-bullets li {
          margin-bottom: 4px;
          color: #000000;
        }
        
        .resume-page .simple-list-section p {
          margin: 0 0 4px 0;
          color: #000000;
        }

        @media print {
          .resume-page {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0.5in;
            box-shadow: none;
          }
          
          .resume-page .section {
            page-break-inside: avoid;
          }
          
          .resume-page .entry {
            page-break-inside: avoid;
          }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={`${isFullscreen ? 'max-w-none w-screen h-screen' : 'max-w-6xl max-h-[90vh]'} overflow-hidden`}
          aria-describedby="resume-preview-description"
        >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-col space-y-1">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Resume Preview & PDF Export</span>
            </DialogTitle>
            <p id="resume-preview-description" className="text-sm text-muted-foreground">
              Preview your resume and export as PDF using your browser's print function
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

            {/* Download Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center space-x-2 text-white"
                  style={{ backgroundColor: '#D07D00' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B86F00'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D07D00'}
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadDOCX} className="cursor-pointer">
                  <FileDown className="h-4 w-4 mr-2" />
                  Download DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                    <div className="bg-gray-100 p-8 overflow-auto max-h-[calc(100vh-200px)]">
                      <div 
                        className="mx-auto bg-white shadow-lg border border-gray-200"
                        style={{
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: 'top center',
                          transition: 'transform 0.2s ease-in-out',
                          width: '210mm',
                          minHeight: '297mm',
                          padding: '2mm',
                          boxSizing: 'border-box'
                        }}
                      >
                        {htmlContent ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                            className="h-full"
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
                        <span className="text-green-600 font-medium">Browser print ensures perfect formatting</span>
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
    </>
  );
};

export default ResumePreview;
