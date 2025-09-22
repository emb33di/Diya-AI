import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Calendar, Edit3 } from "lucide-react";

interface ActivityData {
  id: number;
  title: string;
  position: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  bullets: string[];
}

interface ActivityEditorProps {
  activity: ActivityData;
  category: string;
  onUpdate: (activityId: number, updatedActivity: Partial<ActivityData>) => void;
  onRemove: (activityId: number) => void;
}

const ActivityEditor = ({ activity, category, onUpdate, onRemove }: ActivityEditorProps) => {
  const [localActivity, setLocalActivity] = useState<ActivityData>(activity);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when activity prop changes
  useEffect(() => {
    setLocalActivity(activity);
  }, [activity]);

  // Debounced update to parent state when local state changes
  useEffect(() => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new timeout for debounced update
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(activity.id, localActivity);
    }, 500); // 500ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [localActivity, activity.id, onUpdate]);

  const handleInputChange = (field: keyof ActivityData, value: string | boolean) => {
    setLocalActivity(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBulletChange = (index: number, value: string) => {
    setLocalActivity(prev => ({
      ...prev,
      bullets: prev.bullets.map((bullet, i) => i === index ? value : bullet)
    }));
  };

  const addBullet = () => {
    setLocalActivity(prev => ({
      ...prev,
      bullets: [...prev.bullets, '']
    }));
  };

  const removeBullet = (index: number) => {
    if (localActivity.bullets.length > 1) {
      setLocalActivity(prev => ({
        ...prev,
        bullets: prev.bullets.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
  };

  const handleTitleChange = (value: string) => {
    setLocalActivity(prev => ({
      ...prev,
      title: value
    }));
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      academic: 'Academic',
      experience: 'Experience',
      projects: 'Projects',
      extracurricular: 'Extracurricular',
      volunteering: 'Volunteering',
      skills: 'Skills',
      interests: 'Interests',
      languages: 'Languages'
    };
    return labels[category] || category;
  };

  return (
    <Card className="shadow-lg group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            {isEditingTitle ? (
              <Input
                value={localActivity.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleSave();
                  }
                }}
                placeholder={`Enter ${getCategoryLabel(category).toLowerCase()} title...`}
                className="text-lg font-semibold border-none shadow-none p-0 h-auto"
                autoFocus
              />
            ) : (
              <CardTitle 
                className="text-lg capitalize cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                onClick={handleTitleEdit}
              >
                {localActivity.title || `${getCategoryLabel(category)} Entry`}
              </CardTitle>
            )}
            {!isEditingTitle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTitleEdit}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(activity.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Position Field - Hide for skills, interests, and languages */}
        {(category !== 'skills' && category !== 'interests' && category !== 'languages') && (
          <div className="space-y-2">
            <Label htmlFor={`position-${activity.id}`}>
              {category === 'academic' ? 'Degree/Program' :
               category === 'experience' ? 'Position' :
               category === 'projects' ? 'Role' : 'Role'}
            </Label>
            <Input
              id={`position-${activity.id}`}
              value={localActivity.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              placeholder={
                category === 'academic' ? 'e.g., Bachelor of Computer Science' :
                category === 'experience' ? 'e.g., Software Engineer Intern' :
                category === 'projects' ? 'e.g., Full-Stack Developer' : 'e.g., President'
              }
            />
          </div>
        )}

        {/* Date Fields - Show for academic, experience, volunteering, and extracurricular */}
        {(category === 'academic' || category === 'experience' || category === 'volunteering' || category === 'extracurricular') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`fromDate-${activity.id}`}>From Date</Label>
              <Input
                id={`fromDate-${activity.id}`}
                value={localActivity.fromDate}
                onChange={(e) => handleInputChange('fromDate', e.target.value)}
                placeholder="MM/YYYY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`toDate-${activity.id}`}>To Date</Label>
              <Input
                id={`toDate-${activity.id}`}
                value={localActivity.toDate}
                onChange={(e) => handleInputChange('toDate', e.target.value)}
                placeholder="MM/YYYY"
                disabled={localActivity.isCurrent}
              />
            </div>
          </div>
        )}

        {/* Current Role Checkbox - Only show for experience */}
        {category === 'experience' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`isCurrent-${activity.id}`}
              checked={localActivity.isCurrent}
              onCheckedChange={(checked) => handleInputChange('isCurrent', checked as boolean)}
            />
            <Label htmlFor={`isCurrent-${activity.id}`} className="text-sm">
              I am currently in this role
            </Label>
          </div>
        )}

        {/* Bullet Points - Only show for certain categories */}
        {(category === 'academic' || category === 'experience' || category === 'volunteering' || category === 'extracurricular' || category === 'projects') && (
          <div className="space-y-3">
            <Label>Description & Achievements</Label>
            {localActivity.bullets.map((bullet, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">Bullet {index + 1}</Label>
                <div className="flex items-start space-x-2">
                  <Textarea
                    value={bullet}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    placeholder={`Describe your ${category === 'academic' ? 'academic' : 
                      category === 'experience' ? 'work' :
                      category === 'volunteering' ? 'volunteer' :
                      category === 'extracurricular' ? 'extracurricular' :
                      category === 'projects' ? 'project' : 'activity'} experience...`}
                    className="flex-1 min-h-[80px]"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Point
            </Button>
          </div>
        )}

        {/* Skills - Simple numbered list */}
        {category === 'skills' && (
          <div className="space-y-3">
            <Label>Skills</Label>
            {localActivity.bullets.map((skill, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">Skill {index + 1}</Label>
                <div className="flex items-start space-x-2">
                  <Input
                    value={skill}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    placeholder={
                      index === 0 ? "e.g., JavaScript, Python, React" :
                      index === 1 ? "e.g., Leadership, Team Management" :
                      index === 2 ? "e.g., Data Analysis, Excel, SQL" :
                      index === 3 ? "e.g., Public Speaking, Communication" :
                      "e.g., Project Management, Strategic Planning"
                    }
                    className="flex-1"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Skill
            </Button>
          </div>
        )}

        {/* Interests - Simple numbered list */}
        {category === 'interests' && (
          <div className="space-y-3">
            <Label>Interests</Label>
            {localActivity.bullets.map((interest, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">Interest {index + 1}</Label>
                <div className="flex items-start space-x-2">
                  <Input
                    value={interest}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    placeholder={
                      index === 0 ? "e.g., Photography, Travel" :
                      index === 1 ? "e.g., Music, Art" :
                      index === 2 ? "e.g., Sports, Fitness" :
                      index === 3 ? "e.g., Reading, Writing" :
                      "e.g., Cooking, Gardening"
                    }
                    className="flex-1"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Interest
            </Button>
          </div>
        )}

        {/* Languages - Simple numbered list */}
        {category === 'languages' && (
          <div className="space-y-3">
            <Label>Languages</Label>
            {localActivity.bullets.map((language, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">Language {index + 1}</Label>
                <div className="flex items-start space-x-2">
                  <Input
                    value={language}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    placeholder={
                      index === 0 ? "e.g., Spanish (Fluent)" :
                      index === 1 ? "e.g., French (Conversational)" :
                      index === 2 ? "e.g., Mandarin (Beginner)" :
                      index === 3 ? "e.g., German (Intermediate)" :
                      "e.g., Portuguese (Native)"
                    }
                    className="flex-1"
                  />
                  {localActivity.bullets.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBullet(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addBullet}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Language
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityEditor;
