import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeographicPreference } from '@/hooks/profile';

interface GeographicPreferencesManagerProps {
  preferences: GeographicPreference[];
  onAdd: (preference: string) => void;
  onDelete: (id: string) => void;
}

const countryOptions = [
  { value: "US", label: "US" },
  { value: "UK", label: "UK" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Sweden", label: "Sweden" },
  { value: "Singapore", label: "Singapore" },
  { value: "Japan", label: "Japan" },
  { value: "South Korea", label: "South Korea" },
  { value: "New Zealand", label: "New Zealand" },
];

export const GeographicPreferencesManager: React.FC<GeographicPreferencesManagerProps> = ({
  preferences,
  onAdd,
  onDelete
}) => {
  const [newPreference, setNewPreference] = useState<string>("");

  const handleAddPreference = () => {
    if (newPreference) {
      onAdd(newPreference);
      setNewPreference("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold mb-2">Geographic Preferences</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Country Preference</label>
            <Select value={newPreference} onValueChange={setNewPreference}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country preference" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleAddPreference} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Preference
            </Button>
          </div>
        </div>
      </div>
      
      {preferences.length > 0 && (
        <div className="space-y-2">
          {preferences.map((preference) => (
            <div key={preference.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span>{preference.preference}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => preference.id && onDelete(preference.id)}
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
