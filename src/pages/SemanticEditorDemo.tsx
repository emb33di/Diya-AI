/**
 * Semantic Editor Demo Page
 * 
 * Demonstrates the new semantic document architecture with Google Docs-like commenting.
 */

import React, { useState } from 'react';
import SemanticEssayEditor from '@/components/essay/SemanticEssayEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  MessageSquare, 
  Sparkles, 
  CheckCircle,
  ArrowLeft,
  Info
} from 'lucide-react';

const SemanticEditorDemo: React.FC = () => {
  const [selectedEssayId, setSelectedEssayId] = useState<string>('demo-essay-1');
  const [essayTitle, setEssayTitle] = useState<string>('My College Application Essay');

  // Sample essay content for demonstration
  const sampleEssays = {
    'demo-essay-1': {
      title: 'My College Application Essay',
      content: `
        <p>Growing up in a small town, I always dreamed of making a difference in the world. When I was twelve years old, I witnessed my grandmother struggle with diabetes management, and I realized that technology could be a powerful tool for improving healthcare outcomes.</p>
        
        <p>This realization led me to start a local coding club at my high school, where I taught other students how to build simple mobile applications. Through this experience, I learned that leadership isn't about having all the answers, but about creating an environment where everyone can contribute their unique skills and perspectives.</p>
        
        <p>As I prepare for college, I'm excited to continue exploring the intersection of technology and healthcare. I believe that with the right education and opportunities, I can help develop innovative solutions that make healthcare more accessible and effective for people around the world.</p>
      `
    },
    'demo-essay-2': {
      title: 'Overcoming Adversity',
      content: `
        <p>When my family lost our home during the economic recession, I learned that resilience isn't just about bouncing back from setbacks—it's about finding creative solutions and helping others along the way.</p>
        
        <p>During this challenging time, I started volunteering at our local food bank, where I organized donation drives and helped distribute meals to families in need. This experience taught me the importance of community support and the power of collective action.</p>
        
        <p>Now, as I look toward college, I'm determined to study social work and public policy so I can help create systemic solutions to poverty and inequality. I believe that education is the key to breaking cycles of disadvantage and creating a more just society.</p>
      `
    }
  };

  const currentEssay = sampleEssays[selectedEssayId as keyof typeof sampleEssays];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Essays
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Semantic Editor Demo</h1>
                <p className="text-sm text-gray-500">New architecture with stable AI commenting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                New Architecture
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Essay Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample Essays</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant={selectedEssayId === 'demo-essay-1' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedEssayId('demo-essay-1')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    College Application Essay
                  </Button>
                  <Button
                    variant={selectedEssayId === 'demo-essay-2' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedEssayId('demo-essay-2')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Overcoming Adversity
                  </Button>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">New Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Stable comment positioning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Block-based architecture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Google Docs-like UX</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">AI comment generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Real-time collaboration ready</span>
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong>Semantic Blocks:</strong> Essays are broken into stable content blocks that never change position.
                  </p>
                  <p>
                    <strong>Stable Anchoring:</strong> Comments are anchored to block IDs and optional target text, not fragile positions.
                  </p>
                  <p>
                    <strong>AI Integration:</strong> AI analyzes semantic structure and generates precise, contextual comments.
                  </p>
                  <p>
                    <strong>Migration:</strong> Existing essays are automatically converted to the new format.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            <SemanticEssayEditor
              essayId={selectedEssayId}
              title={currentEssay.title}
              initialContent={currentEssay.content}
              onTitleChange={setEssayTitle}
              onContentChange={(content) => {
                // Content change handler
              }}
            />
          </div>
        </div>

        {/* Comparison Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Architecture Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Old System */}
                <div>
                  <h3 className="text-lg font-semibold text-red-600 mb-4">Old System (TipTap/ProseMirror)</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Position-based comment anchoring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Comments drift when content changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>4+ conflicting positioning systems</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Complex extension architecture</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>AI-document mismatch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Fragile text matching</span>
                    </div>
                  </div>
                </div>

                {/* New System */}
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-4">New System (Semantic Architecture)</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Block-based comment anchoring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Comments never drift from targets</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Single, stable positioning system</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Clean, maintainable architecture</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>AI-natural content analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Precise text targeting</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SemanticEditorDemo;
