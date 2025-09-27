import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeographicPreferencesManager } from '@/components/profile/shared';
import { ProfileFormData, GeographicPreference } from '@/hooks/profile';

interface CollegePreferencesSectionProps {
  form: UseFormReturn<ProfileFormData>;
  geographicPreferences: GeographicPreference[];
  addGeographicPreference: (preference: Omit<GeographicPreference, 'id'>) => void;
  deleteGeographicPreference: (id: string) => void;
}

export const CollegePreferencesSection: React.FC<CollegePreferencesSectionProps> = ({
  form,
  geographicPreferences,
  addGeographicPreference,
  deleteGeographicPreference
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>College Preferences</CardTitle>
        <CardDescription>What you're looking for in a college</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ideal_college_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ideal College Size</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select college size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not_specified">Not specified</SelectItem>
                    <SelectItem value="Small (< 2,000 students)">Small (&lt; 2,000 students)</SelectItem>
                    <SelectItem value="Medium (2,000 - 15,000 students)">Medium (2,000 - 15,000 students)</SelectItem>
                    <SelectItem value="Large (> 15,000 students)">Large (&gt; 15,000 students)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ideal_college_setting"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ideal College Setting</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select college setting" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not_specified">Not specified</SelectItem>
                    <SelectItem value="Urban">Urban</SelectItem>
                    <SelectItem value="Suburban">Suburban</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                    <SelectItem value="College Town">College Town</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Geographic Preferences Section */}
        <GeographicPreferencesManager
          preferences={geographicPreferences}
          onAdd={addGeographicPreference}
          onDelete={deleteGeographicPreference}
        />

        <FormField
          control={form.control}
          name="must_haves"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Must-Haves</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="What features are essential for your ideal college?" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deal_breakers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal-Breakers</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="What would make you not want to attend a college?" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
