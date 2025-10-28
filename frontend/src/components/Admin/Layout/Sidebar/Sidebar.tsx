import React from "react";
import { useLocation } from "react-router-dom";
import SidebarItem from "./SidebarItem";
import { NAV_ITEMS } from "../../../../utils/constants";
import {
  MdDashboard,
  MdPeople,
  MdEvent,
  MdBusiness,
  MdAnalytics,
  MdSettings,
  MdDevices,
  MdRule,
} from "react-icons/md";

interface SidebarProps {
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();

  // Icon mapping
  const iconMap = {
    MdDashboard,
    MdPeople,
    MdEvent,
    MdBusiness,
    MdAnalytics,
    MdSettings,
    MdDevices,
    MdRule,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 sm:h-16 px-3 sm:px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm">IH</span>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            InnoviaHub
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const IconComponent = iconMap[item.icon as keyof typeof iconMap];
          const isActive = location.pathname === item.path;

          return (
            <SidebarItem
              key={item.id}
              item={item}
              icon={IconComponent}
              isActive={isActive}
              onClick={onClose}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 sm:p-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">Admin Dashboard v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
