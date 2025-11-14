import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Home, GraduationCap, FileText, PenTool, Users, Calendar, BookOpen, ChevronDown, FolderOpen, Mail } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";

const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const location = useLocation();
  const { onboardingCompleted, loading: onboardingLoading } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    {
      path: "/schools",
      label: "Schools",
      icon: <GraduationCap className="h-5 w-5" />,
      disabled: false,
    },
    {
      path: "/resume",
      label: "Resume",
      icon: <FileText className="h-5 w-5" />,
      disabled: false,
    },
    {
      path: "/essays",
      label: "Essays",
      icon: <PenTool className="h-5 w-5" />,
      disabled: false,
    },
    {
      path: "/lor",
      label: "LOR",
      icon: <Users className="h-5 w-5" />,
      disabled: false,
    },
    {
      path: "/deadlines",
      label: "Deadlines",
      icon: <Calendar className="h-5 w-5" />,
      disabled: false,
    },
  ];

  const resourcesItems = [
    {
      path: "/blog",
      label: "Blog",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      path: "/contact",
      label: "Contact",
      icon: <Mail className="h-5 w-5" />,
    },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Menu className="h-6 w-6 text-gray-700" />
          <span className="sr-only">Open navigation menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-white">
        <SheetHeader className="px-6 py-4 border-b border-gray-200">
          <SheetTitle className="text-left text-lg font-semibold text-gray-900">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col py-4 space-y-1">
          {navigationItems.map((item) => (
            <div key={item.path} className="px-4">
              {item.disabled ? (
                <div className="flex items-center space-x-3 py-3 px-3 rounded-lg text-gray-400 cursor-not-allowed">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ) : (
                <Link
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-3 py-3 px-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "text-primary bg-primary/10 border border-primary/20"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )}
            </div>
          ))}
          
          {/* Resources Section */}
          <div className="px-4">
            <Collapsible open={resourcesOpen} onOpenChange={setResourcesOpen}>
              <CollapsibleTrigger className="flex items-center space-x-3 py-3 px-3 rounded-lg transition-colors text-gray-700 hover:text-primary hover:bg-gray-50 w-full">
                <FolderOpen className="h-5 w-5" />
                <span className="text-sm font-medium">Resources</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {resourcesItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center space-x-3 py-2 px-6 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? "text-primary bg-primary/10 border border-primary/20"
                        : "text-gray-600 hover:text-primary hover:bg-gray-50"
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;
