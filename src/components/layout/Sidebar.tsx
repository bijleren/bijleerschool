import React from 'react';
import { School, UserCheck, Users, Link } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  { id: 'profile', name: 'Mijn Profiel', icon: UserCheck },
  { id: 'schools', name: 'Scholen', icon: School },
  { id: 'webwijzer', name: 'WebWijzer', icon: Link },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}