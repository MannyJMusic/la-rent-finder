'use client';

import { Button } from '@/components/ui/button';
import { Search, Bookmark, Calendar, DollarSign } from 'lucide-react';
import { QuickAction } from '@/lib/types/chat';

interface QuickActionButtonsProps {
  onAction: (action: QuickAction) => void;
  disabled?: boolean;
}

export default function QuickActionButtons({
  onAction,
  disabled = false,
}: QuickActionButtonsProps) {
  const actions = [
    {
      id: 'new-search' as QuickAction,
      label: 'New Search',
      icon: Search,
      description: 'Start a new rental search',
    },
    {
      id: 'view-saved' as QuickAction,
      label: 'Saved',
      icon: Bookmark,
      description: 'View saved properties',
    },
    {
      id: 'appointments' as QuickAction,
      label: 'Appointments',
      icon: Calendar,
      description: 'Manage viewing appointments',
    },
    {
      id: 'costs' as QuickAction,
      label: 'Costs',
      icon: DollarSign,
      description: 'Calculate rental costs',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-4 border-t bg-muted/30">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className="flex items-center gap-2 justify-start h-auto py-2"
            title={action.description}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs truncate">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
