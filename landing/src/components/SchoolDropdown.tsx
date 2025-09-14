import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import schoolsData from '@/data/indian-schools.json';

interface School {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface SchoolDropdownProps {
  onSchoolSelect: (school: School) => void;
  selectedSchool?: School;
  placeholder?: string;
}

const SchoolDropdown = ({ onSchoolSelect, selectedSchool, placeholder = "Search your school..." }: SchoolDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSchools, setFilteredSchools] = useState<School[]>(schoolsData);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSchool, setCustomSchool] = useState("");

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredSchools(schoolsData);
      setShowCustomInput(false);
    } else {
      const filtered = schoolsData.filter((school) =>
        school.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        school.city.toLowerCase().includes(searchValue.toLowerCase()) ||
        school.state.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredSchools(filtered);
      // Show custom input option if no results found
      setShowCustomInput(filtered.length === 0 && searchValue.trim().length > 0);
    }
  }, [searchValue]);

  const handleCustomSchoolSubmit = () => {
    if (customSchool.trim()) {
      const customSchoolObj: School = {
        id: -1, // Use negative ID to indicate custom school
        name: customSchool.trim(),
        city: "Custom",
        state: "Custom"
      };
      onSchoolSelect(customSchoolObj);
      setOpen(false);
      setSearchValue("");
      setCustomSchool("");
      setShowCustomInput(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-card/50 backdrop-blur-sm border-primary/20 hover:bg-card/70 min-h-[44px] sm:min-h-[40px] touch-manipulation"
        >
          {selectedSchool ? (
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm sm:text-base">{selectedSchool.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedSchool.id === -1 ? "Custom School" : `${selectedSchool.city}, ${selectedSchool.state}`}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search schools..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="border-0 focus:ring-0 text-sm sm:text-base"
            />
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {showCustomInput ? (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">No school found. Add your school:</p>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Input
                      placeholder="Enter your school name..."
                      value={customSchool}
                      onChange={(e) => setCustomSchool(e.target.value)}
                      className="flex-1 text-sm sm:text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomSchoolSubmit();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleCustomSchoolSubmit}
                      disabled={!customSchool.trim()}
                      className="shrink-0 touch-manipulation"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                "No school found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSchools.map((school) => (
                <CommandItem
                  key={school.id}
                  value={school.name}
                  onSelect={() => {
                    onSchoolSelect(school);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="cursor-pointer min-h-[44px] sm:min-h-[40px] touch-manipulation"
                >
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm sm:text-base">{school.name}</span>
                      {selectedSchool?.id === school.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {school.city}, {school.state}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SchoolDropdown; 