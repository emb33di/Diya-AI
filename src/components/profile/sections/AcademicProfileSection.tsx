import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIFormField } from '@/components/profile/shared';
import { TestScoreManager } from '@/components/profile/shared';
import { ProfileFormData, TestScore } from '@/hooks/profile';

interface AcademicProfileSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isAIPopulated: (fieldName: string) => boolean;
  clearFieldError: (fieldName: keyof ProfileFormData) => void;
  satScores: TestScore[];
  actScores: TestScore[];
  addSATScore: (score: Omit<TestScore, 'id'>) => void;
  deleteSATScore: (id: string) => void;
  addACTScore: (score: Omit<TestScore, 'id'>) => void;
  deleteACTScore: (id: string) => void;
}

export const AcademicProfileSection: React.FC<AcademicProfileSectionProps> = ({
  form,
  isAIPopulated,
  clearFieldError,
  satScores,
  actScores,
  addSATScore,
  deleteSATScore,
  addACTScore,
  deleteACTScore
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Profile</CardTitle>
        <CardDescription>Your academic background and achievements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conditional Academic Fields based on Applying To */}
        {form.watch("applying_to") === "Undergraduate" ? (
          <>
            {/* Undergraduate Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIFormField fieldName="high_school_name" isAIPopulated={isAIPopulated}>
                <FormField
                  control={form.control}
                  name="high_school_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>High School Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AIFormField>
              <FormField
                control={form.control}
                name="high_school_graduation_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      High School Graduation Year
                      {form.watch("applying_to") === "Undergraduate" && <span className="text-red-500">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="school_board"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Board <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your school board" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ICSE">ICSE</SelectItem>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="IB">IB</SelectItem>
                        <SelectItem value="NIOS">NIOS</SelectItem>
                        <SelectItem value="CISCE">CISCE</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year_of_study"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Study <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your year of study" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="11th">11th</SelectItem>
                        <SelectItem value="12th">12th</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Conditional Academic Fields based on Year of Study */}
            {form.watch("year_of_study") === "Graduate" ? (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="undergraduate_cgpa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Undergraduate CGPA <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="e.g., 8.5"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="class_10_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class 10 Grade <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="e.g., 85.5%"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class_11_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class 11 Grade <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="e.g., 87.2%"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class_12_half_yearly_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class 12 Half-Yearly Grade <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="e.g., 89.1%"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Test Scores Section */}
            <TestScoreManager
              testType="SAT"
              scores={satScores}
              onAdd={addSATScore}
              onDelete={deleteSATScore}
            />

            <TestScoreManager
              testType="ACT"
              scores={actScores}
              onAdd={addACTScore}
              onDelete={deleteACTScore}
            />
          </>
        ) : (
          <>
            {/* Graduate School Fields (MBA, LLM, PhD, Masters) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="college_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., University of Delhi"
                        onChange={(e) => {
                          field.onChange(e);
                          clearFieldError('college_name');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="college_graduation_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College Graduation Year <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        placeholder="e.g., 2023"
                        onChange={(e) => {
                          field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                          clearFieldError('college_graduation_year');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="college_gpa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College GPA <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        placeholder="e.g., 8.5"
                        onChange={(e) => {
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined);
                          clearFieldError('college_gpa');
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="test_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GRE">GRE</SelectItem>
                        <SelectItem value="GMAT">GMAT</SelectItem>
                        <SelectItem value="LSAT">LSAT</SelectItem>
                        <SelectItem value="Not yet taken">Not yet taken</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="test_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Test Score 
                      {form.watch("test_type") !== "Not yet taken" && <span className="text-red-500">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        placeholder={form.watch("test_type") === "Not yet taken" ? "Test not taken yet" : "Enter your test score"}
                        disabled={form.watch("test_type") === "Not yet taken"}
                        className={form.watch("test_type") === "Not yet taken" ? "bg-gray-100 text-gray-500" : ""}
                        onChange={(e) => {
                          if (form.watch("test_type") !== "Not yet taken") {
                            field.onChange(e.target.value ? parseInt(e.target.value) : undefined);
                            clearFieldError('test_score');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
