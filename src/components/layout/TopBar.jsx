import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/useTheme.jsx';
import { Sun, Moon, Plus, Menu, MoreVertical, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_ITEMS = [
  { label: 'Today', path: '/' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Life Map', path: '/life-map' },
  { label: 'Compass', path: '/compass' },
];

export default function TopBar({ onAddClick, onScheduleAction, onOverflowAction, onToggleSidebar, archivedCount, ignoredCount }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        {/* Hamburger + Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="w-8 h-8">
            <Menu className="w-4 h-4" />
          </Button>
          <Link to="/" className="flex items-center gap-1">
            <span className="text-primary font-bold text-lg tracking-tight">Sync'n</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1 ml-6">
          {NAV_ITEMS.map(item => {
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Schedule dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-sm">Schedule</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onScheduleAction('schedule-remaining')}>
                Schedule Remaining Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleAction('resync')}>
                ↻ Re-sync Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleAction('plan-tomorrow')}>
                📅 Plan Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleAction('plan-week')}>
                📆 Plan the Week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add */}
          <Button variant="default" size="sm" onClick={onAddClick} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-sm">Add</span>
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Overflow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOverflowAction('plan-tomorrow')}>
                📅 Plan Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOverflowAction('archive')}>
                Archive {archivedCount > 0 && `(${archivedCount})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOverflowAction('add-recurring')}>
                Add Recurring
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOverflowAction('ignored')}>
                Ignored {ignoredCount > 0 && `(${ignoredCount})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOverflowAction('energy')}>
                Energy Rhythm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex sm:hidden items-center justify-around border-t border-border/50 h-10">
        {NAV_ITEMS.map(item => {
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                active ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}