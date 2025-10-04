import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ProfileFormData } from '@/hooks/profile';

interface AdditionalInfoSectionProps {
  form: UseFormReturn<ProfileFormData>;
}

export const AdditionalInfoSection: React.FC<AdditionalInfoSectionProps> = ({
  form
}) => {
  // Only show this section for Undergraduate applications
  if (form.watch("applying_to") !== "undergraduate") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Information</CardTitle>
        <CardDescription>Help us understand your goals and preferences better</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extracurricular Activities */}
        <FormField
          control={form.control}
          name="extracurricular_activities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extracurricular Activities & Interests</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your activities, passions, and accomplishments outside of academics..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Leadership Roles */}
        <FormField
          control={form.control}
          name="leadership_roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leadership Roles & Experiences</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe any leadership roles, responsibilities, or experiences you've had..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Personal Projects */}
        <FormField
          control={form.control}
          name="personal_projects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Projects & Initiatives</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share any personal projects, initiatives, or creative work you're proud of..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Application Concerns */}
        <FormField
          control={form.control}
          name="application_concerns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Concerns</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific concerns or anxieties about the application process?"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Specific Questions */}
        <FormField
          control={form.control}
          name="specific_questions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specific Questions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific questions you'd like addressed in your personalized report?"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
