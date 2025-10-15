import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";

interface AddActivityDropdownProps {
  onActivitySelect: (category: string) => void;
}

const AddActivityDropdown = ({ onActivitySelect }: AddActivityDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activityCategories = [
    "Academic",
    "Experience",
    "Leadership",
    "Projects",
    "Extracurricular", 
    "Volunteering",
    "Skills",
    "Interests",
    "Languages"
  ];

  const handleCategoryClick = (category: string) => {
    console.log(`User selected ${category}`);
    onActivitySelect(category);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        <span>Add Activity</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            {activityCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddActivityDropdown;
