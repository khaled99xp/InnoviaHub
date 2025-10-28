import React from "react";
import { NavLink } from "react-router-dom";
import type { IconType } from "react-icons";

interface SidebarItemProps {
  item: {
    id: string;
    label: string;
    icon: string;
    path: string;
    badge?: number;
  };
  icon: IconType;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  icon: Icon,
  onClick,
}) => {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }: { isActive: boolean }) =>
        `flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            />
          </div>

          {/* Label - Always show on mobile, hide only when collapsed on desktop */}
          <span className="ml-2 sm:ml-3 flex-1 truncate text-xs sm:text-sm">
            {item.label}
          </span>

          {/* Badge */}
          {item.badge && item.badge > 0 && (
            <span className="ml-auto inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export default SidebarItem;
