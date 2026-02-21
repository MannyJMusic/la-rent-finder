'use client';

import { User } from '@supabase/supabase-js';
import { Menu, Settings, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useState } from 'react';

interface DashboardHeaderProps {
  user?: User;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LA</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">LA Rent Finder</h1>
          </div>
        </div>

        {/* Center: Search Status (placeholder) */}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span>Ready to search</span>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <UserIcon className="h-5 w-5" />
              <span className="hidden md:inline">
                {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}
              </span>
            </Button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md bg-popover border shadow-lg">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                    <a href="/settings">
                      <Settings className="h-4 w-4" />
                      Settings
                    </a>
                  </Button>
                  <div className="mt-1">
                    <LogoutButton />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
