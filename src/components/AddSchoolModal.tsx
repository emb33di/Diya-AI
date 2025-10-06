import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Trash2 } from 'lucide-react';
import { getUserProgramType } from '@/utils/userProfileUtils';

interface School {
  ranking: number;
  name: string;
  city: string;
  state: string;
  climate: string;
  tier: string;
  acceptance_rate: string;
  sat_range: string;
  act_range: string;
  annual_tuition_usd: number;
  total_estimated_cost_usd: number;
  average_scholarship_usd: number;
  percent_international_aid: number;
  need_blind_for_internationals: boolean;
}

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchool: (schoolData: any) => void;
  onAddMultipleSchools?: (schoolsData: any[]) => void;
  existingSchools?: string[]; // Array of existing school names to prevent duplicates
}

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ isOpen, onClose, onAddSchool, onAddMultipleSchools, existingSchools = [] }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [isCustomSchool, setIsCustomSchool] = useState(false);
  const [customSchoolData, setCustomSchoolData] = useState({
    name: '',
    city: '',
    state: '',
    school_type: 'private',
    acceptance_rate: '',
    school_ranking: '',
    category: 'target',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Load schools from appropriate JSON file based on user's program type
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const userProgramType = await getUserProgramType();
        let schoolFile = '/schools.json'; // Default fallback
        
        // Map program type to appropriate school file
        switch (userProgramType) {
          case 'Undergraduate':
            schoolFile = '/undergraduate-schools.json';
            break;
          case 'MBA':
            schoolFile = '/mba-schools.json';
            break;
          case 'LLM':
          case 'PhD':
          case 'Masters':
            schoolFile = '/graduate-schools.json';
            break;
          default:
            schoolFile = '/schools.json'; // Fallback to original file
            break;
        }

        const response = await fetch(schoolFile);
        const data = await response.json();
        setSchools(data.schools || []);
      } catch (error) {
        console.error('[SCHOOLS_ERROR] Failed to load schools data:', {
          userId: user?.id || 'unknown',
          userEmail: user?.email || 'unknown',
          programType: userProgramType,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          message: 'User cannot see available schools to add'
        });
        // Fallback to empty array
        setSchools([]);
      }
    };

    if (isOpen) {
      loadSchools();
    }
  }, [isOpen]);

  // Filter schools based on search term and exclude existing schools
  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isNotExisting = !existingSchools.some(existingSchool => 
      existingSchool.toLowerCase() === school.name.toLowerCase()
    );
    
    return matchesSearch && isNotExisting;
  });

  // Helper functions for school selection
  const addSchoolToSelection = (school: School) => {
    // Check if school is already selected
    if (!selectedSchools.find(s => s.name === school.name)) {
      setSelectedSchools([...selectedSchools, school]);
    }
  };

  const removeSchoolFromSelection = (schoolName: string) => {
    setSelectedSchools(selectedSchools.filter(school => school.name !== schoolName));
  };

  const clearAllSelections = () => {
    setSelectedSchools([]);
  };

  const handleAddAllSchools = async () => {
    setLoading(true);
    
    try {
      if (selectedSchools.length === 0) {
        return;
      }

      // Add multiple selected schools
      const getSchoolType = (tier: string) => {
        const tierLower = tier.toLowerCase();
        if (tierLower.includes('ivy') || tierLower.includes('private')) return 'private';
        if (tierLower.includes('public')) return 'public';
        if (tierLower.includes('liberal')) return 'liberal_arts';
        return 'private'; // default
      };
      
      const schoolsData = selectedSchools.map(school => ({
        school: school.name,
        school_type: getSchoolType(school.tier),
        school_ranking: school.ranking.toString(),
        acceptance_rate: school.acceptance_rate,
        ed_deadline: 'N/A',
        first_round_deadline: 'TBD',
        notes: `${school.name} in ${school.city}, ${school.state}`,
        student_thesis: `${school.name} in ${school.city}, ${school.state}`,
        category: 'target' // Default category, user can change later
      }));
      
      if (onAddMultipleSchools) {
        await onAddMultipleSchools(schoolsData);
      } else {
        // Fallback to adding one by one
        for (const schoolData of schoolsData) {
          await onAddSchool(schoolData);
        }
      }
      
      // Reset form
      setSearchTerm('');
      setSelectedSchools([]);
      setIsCustomSchool(false);
      setCustomSchoolData({
        name: '',
        city: '',
        state: '',
        school_type: 'private',
        acceptance_rate: '',
        school_ranking: '',
        category: 'target',
        notes: ''
      });
      
      onClose();
    } catch (error) {
      console.error('[SCHOOLS_ERROR] Failed to add multiple schools:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolCount: selectedSchools.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot add multiple schools to their list'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomSchool = async () => {
    setLoading(true);
    
    try {
      console.log('handleAddCustomSchool called');
      
      // Add custom school
      const schoolData = {
        school: customSchoolData.name,
        school_type: customSchoolData.school_type,
        school_ranking: customSchoolData.school_ranking || 'N/A',
        acceptance_rate: customSchoolData.acceptance_rate || 'N/A',
        ed_deadline: 'N/A',
        first_round_deadline: 'TBD',
        notes: customSchoolData.notes,
        student_thesis: customSchoolData.notes,
        category: customSchoolData.category
      };
      await onAddSchool(schoolData);
      
      // Reset form
      setCustomSchoolData({
        name: '',
        city: '',
        state: '',
        school_type: 'private',
        acceptance_rate: '',
        school_ranking: '',
        category: 'target',
        notes: ''
      });
      
      onClose();
    } catch (error) {
      console.error('[SCHOOLS_ERROR] Failed to add custom school:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        schoolName: schoolData.school,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot add custom school to their list'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add School to Your List
          </DialogTitle>
          <DialogDescription>
            Search for schools from our database or add a custom school to your list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Toggle between search and custom */}
          <div className="flex gap-2">
            <Button
              variant={!isCustomSchool ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCustomSchool(false)}
            >
              Search Schools
            </Button>
            <Button
              variant={isCustomSchool ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCustomSchool(true)}
            >
              Add Custom School
            </Button>
          </div>

          {!isCustomSchool ? (
            /* Search Schools Section */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Show message about filtered schools */}
              {existingSchools.length > 0 && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p>
                    <strong>Note:</strong> Schools already in your list are hidden from the search results to prevent duplicates.
                  </p>
                </div>
              )}


              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredSchools.slice(0, 20).map((school) => {
                  const isSelected = selectedSchools.find(s => s.name === school.name);
                  return (
                    <div
                      key={school.name}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => addSchoolToSelection(school)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{school.name}</h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {school.city}, {school.state}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">#{school.ranking}</Badge>
                            <Badge variant="outline">{school.tier}</Badge>
                          </div>
                        </div>
                        <div className="text-primary">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredSchools.length === 0 && searchTerm && (
                  <p className="text-center text-muted-foreground py-4">
                    No schools found matching "{searchTerm}"
                  </p>
                )}
                {!searchTerm && (
                  <p className="text-center text-muted-foreground py-4">
                    Start typing to search schools...
                  </p>
                )}
              </div>

              {/* Selected Schools List */}
              {selectedSchools.length > 0 && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Selected Schools ({selectedSchools.length}):</h4>
                    <Button variant="outline" size="sm" onClick={clearAllSelections}>
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedSchools.map((school) => (
                      <div key={school.name} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{school.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {school.city}, {school.state} • #{school.ranking}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSchoolFromSelection(school.name)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom School Section */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="school-name">School Name *</Label>
                  <Input
                    id="school-name"
                    value={customSchoolData.name}
                    onChange={(e) => setCustomSchoolData({...customSchoolData, name: e.target.value})}
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <Label htmlFor="school-type">School Type</Label>
                  <Select
                    value={customSchoolData.school_type}
                    onValueChange={(value) => setCustomSchoolData({...customSchoolData, school_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="liberal_arts">Liberal Arts</SelectItem>
                      <SelectItem value="research_university">Research University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="school-city">City</Label>
                  <Input
                    id="school-city"
                    value={customSchoolData.city}
                    onChange={(e) => setCustomSchoolData({...customSchoolData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="school-state">State</Label>
                  <Input
                    id="school-state"
                    value={customSchoolData.state}
                    onChange={(e) => setCustomSchoolData({...customSchoolData, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="school-category">Category</Label>
                  <Select
                    value={customSchoolData.category}
                    onValueChange={(value) => setCustomSchoolData({...customSchoolData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reach">Reach</SelectItem>
                      <SelectItem value="target">Target</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="school-ranking">Ranking</Label>
                <Input
                  id="school-ranking"
                  value={customSchoolData.school_ranking}
                  onChange={(e) => setCustomSchoolData({...customSchoolData, school_ranking: e.target.value})}
                  placeholder="e.g., 25"
                />
              </div>

              <div>
                <Label htmlFor="school-notes">Notes</Label>
                <Input
                  id="school-notes"
                  value={customSchoolData.notes}
                  onChange={(e) => setCustomSchoolData({...customSchoolData, notes: e.target.value})}
                  placeholder="Why this school interests you..."
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {isCustomSchool ? (
              <Button 
                onClick={handleAddCustomSchool}
                disabled={loading || !customSchoolData.name}
              >
                {loading ? 'Adding...' : 'Add Custom School'}
              </Button>
            ) : (
              <Button 
                onClick={handleAddAllSchools}
                disabled={loading || selectedSchools.length === 0}
              >
                {loading 
                  ? 'Adding...' 
                  : `Add ${selectedSchools.length} School${selectedSchools.length !== 1 ? 's' : ''}`
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSchoolModal; 