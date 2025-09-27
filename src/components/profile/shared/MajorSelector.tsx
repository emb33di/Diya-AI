import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

interface MajorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onClearError: () => void;
  isAIPopulated: boolean;
}

const popularMajorsForIndianStudents = [
  "Computer Science",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Software Engineering",
  "Information Technology",
  "Cybersecurity",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
  "Biomedical Engineering",
  "Industrial Engineering",
  "Materials Science Engineering",
  "Environmental Engineering",
  "Petroleum Engineering",
  "Nuclear Engineering",
  "Robotics Engineering",
  "Business Administration",
  "Finance",
  "Accounting",
  "Marketing",
  "Management",
  "International Business",
  "Economics",
  "Supply Chain Management",
  "Human Resources",
  "Operations Research",
  "Statistics",
  "Mathematics",
  "Applied Mathematics",
  "Actuarial Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Biochemistry",
  "Biotechnology",
  "Microbiology",
  "Genetics",
  "Neuroscience",
  "Psychology",
  "Public Health",
  "Health Administration",
  "Nursing",
  "Pharmacy",
  "Medicine (Pre-med)",
  "Dentistry (Pre-dental)",
  "Veterinary Science",
  "Architecture",
  "Urban Planning",
  "Graphic Design",
  "Digital Media",
  "Film Studies",
  "Journalism",
  "Mass Communication",
  "Public Relations",
  "Advertising",
  "English Literature",
  "Creative Writing",
  "Political Science",
  "International Relations",
  "Public Policy",
  "Law (Pre-law)",
  "Criminal Justice",
  "Social Work",
  "Sociology",
  "Anthropology",
  "History",
  "Geography",
  "Philosophy",
  "Religious Studies",
  "Education",
  "Elementary Education",
  "Secondary Education",
  "Special Education",
  "Educational Psychology",
  "Agricultural Sciences",
  "Food Science",
  "Nutrition",
  "Hospitality Management",
  "Tourism Management",
  "Sports Management",
  "Exercise Science",
  "Kinesiology",
  "Music",
  "Fine Arts",
  "Art History",
  "Theater",
  "Dance",
  "Fashion Design",
  "Interior Design",
  "Landscape Architecture",
  "Environmental Science",
  "Sustainability Studies",
  "Renewable Energy",
  "Geology",
  "Meteorology",
  "Astronomy",
  "Astrophysics",
  "Other"
];

export const MajorSelector: React.FC<MajorSelectorProps> = ({
  value,
  onChange,
  onClearError,
  isAIPopulated
}) => {
  const [majorSearchQuery, setMajorSearchQuery] = useState("");
  const [showOtherMajorInput, setShowOtherMajorInput] = useState(false);

  const filteredMajors = popularMajorsForIndianStudents.filter(major =>
    major.toLowerCase().includes(majorSearchQuery.toLowerCase())
  );

  const handleMajorSelection = (selectedMajor: string) => {
    if (selectedMajor === "Other") {
      setShowOtherMajorInput(true);
      onChange("");
    } else {
      onChange(selectedMajor);
      onClearError();
    }
    setMajorSearchQuery("");
  };

  return (
    <div className="space-y-2">
      {!showOtherMajorInput ? (
        <div className="relative">
          <Input
            placeholder="Search for your intended major..."
            value={value || majorSearchQuery}
            onChange={(e) => {
              setMajorSearchQuery(e.target.value);
              if (!e.target.value) {
                onChange("");
              }
            }}
            onFocus={() => {
              if (value) {
                setMajorSearchQuery(value);
              }
            }}
          />
          {majorSearchQuery && filteredMajors.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredMajors.map((major) => (
                <div
                  key={major}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleMajorSelection(major)}
                >
                  {major}
                </div>
              ))}
            </div>
          )}
          {majorSearchQuery && filteredMajors.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <div className="px-3 py-2 text-sm text-gray-500">
                No majors found. Try selecting "Other" below.
              </div>
            </div>
          )}
        </div>
      ) : (
        <Input
          placeholder="Enter your custom major..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onClearError();
          }}
        />
      )}
      
      {value && !showOtherMajorInput && (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
          <span className="text-sm text-green-800">Selected: {value}</span>
          <button
            type="button"
            className="text-xs text-green-600 hover:text-green-800 underline"
            onClick={() => {
              onChange("");
              setMajorSearchQuery("");
            }}
          >
            Clear
          </button>
        </div>
      )}
      
      {!showOtherMajorInput && (
        <div className="text-sm">
          <span className="text-gray-600">Popular majors: </span>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 underline mr-2"
            onClick={() => handleMajorSelection("Computer Science")}
          >
            Computer Science
          </button>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 underline mr-2"
            onClick={() => handleMajorSelection("Business Administration")}
          >
            Business
          </button>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 underline mr-2"
            onClick={() => handleMajorSelection("Engineering")}
          >
            Engineering
          </button>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 underline mr-2"
            onClick={() => handleMajorSelection("Other")}
          >
            Other
          </button>
        </div>
      )}
      
      {showOtherMajorInput && (
        <button
          type="button"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          onClick={() => {
            setShowOtherMajorInput(false);
            onChange("");
          }}
        >
          ← Back to popular majors
        </button>
      )}
    </div>
  );
};
