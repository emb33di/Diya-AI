import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TestScore } from '@/hooks/profile';

interface TestScoreManagerProps {
  testType: 'SAT' | 'ACT';
  scores: TestScore[];
  onAdd: (score: TestScore) => void;
  onDelete: (id: string) => void;
}

export const TestScoreManager: React.FC<TestScoreManagerProps> = ({
  testType,
  scores,
  onAdd,
  onDelete
}) => {
  const [newScore, setNewScore] = useState<TestScore>({ 
    score: 0, 
    year_taken: new Date().getFullYear() 
  });

  const handleAddScore = () => {
    onAdd(newScore);
    setNewScore({ score: 0, year_taken: new Date().getFullYear() });
  };

  const scoreRange = testType === 'SAT' ? { min: 400, max: 1600 } : { min: 1, max: 36 };
  const scoreLabel = testType === 'SAT' ? 'SAT Score' : 'ACT Score';

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold mb-2">{testType} Scores</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{scoreLabel}</label>
            <Input
              type="number"
              placeholder={`Enter your ${testType} score`}
              min={scoreRange.min}
              max={scoreRange.max}
              value={newScore.score || ""}
              onChange={(e) => setNewScore({ ...newScore, score: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Year Taken</label>
            <Input
              type="number"
              placeholder="Year you took the test"
              value={newScore.year_taken}
              onChange={(e) => setNewScore({ ...newScore, year_taken: parseInt(e.target.value) || new Date().getFullYear() })}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleAddScore} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add {testType} Score
            </Button>
          </div>
        </div>
      </div>
      
      {scores.length > 0 && (
        <div className="space-y-2">
          {scores.map((score) => (
            <div key={score.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span>{scoreLabel}: {score.score} ({score.year_taken})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => score.id && onDelete(score.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
