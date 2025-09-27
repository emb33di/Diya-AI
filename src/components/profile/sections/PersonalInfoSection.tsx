import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIFormField } from '@/components/profile/shared';
import { MajorSelector } from '@/components/profile/shared';
import { ProfileFormData } from '@/hooks/profile';

interface PersonalInfoSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isAIPopulated: (fieldName: string) => boolean;
  clearFieldError: (fieldName: keyof ProfileFormData) => void;
  countryCodes: Array<{ code: string; country: string; flag: string }>;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  form,
  isAIPopulated,
  clearFieldError,
  countryCodes
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Basic details about yourself</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AIFormField fieldName="full_name" isAIPopulated={isAIPopulated}>
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        clearFieldError('full_name');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AIFormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AIFormField fieldName="email_address" isAIPopulated={isAIPopulated}>
            <FormField
              control={form.control}
              name="email_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        clearFieldError('email_address');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AIFormField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Code <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter phone number"
                      onChange={(e) => {
                        field.onChange(e);
                        clearFieldError('phone_number');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Applying To Section - Read Only */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="applying_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Type</FormLabel>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                    {field.value || "Not set"}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Set during account creation
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Field: Field of Focus for Masters and PhD */}
          {(form.watch("applying_to") === "Masters" || form.watch("applying_to") === "PhD") && (
            <FormField
              control={form.control}
              name="masters_field_of_focus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field of Focus <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Computer Science, Business Analytics, Data Science"
                      onChange={(e) => {
                        field.onChange(e);
                        clearFieldError('masters_field_of_focus');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Conditional Field: Intended Majors (only for Undergraduate) */}
          {form.watch("applying_to") === "Undergraduate" && (
            <AIFormField fieldName="intended_majors" isAIPopulated={isAIPopulated}>
              <FormField
                control={form.control}
                name="intended_majors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intended Major(s) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <MajorSelector
                        value={field.value || ""}
                        onChange={field.onChange}
                        onClearError={() => clearFieldError("intended_majors")}
                        isAIPopulated={isAIPopulated("intended_majors")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AIFormField>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
