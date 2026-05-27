import { format, addDays, startOfDay, differenceInCalendarDays, startOfWeek, isToday } from 'date-fns';

// Get today's reference date at midnight
export function getToday() {
  return startOfDay(new Date());
}

// Convert a day_offset to a Date
export function offsetToDate(offset) {
  return addDays(getToday(), offset);
}

// Convert a Date to day_offset from today
export function dateToOffset(date) {
  return differenceInCalendarDays(startOfDay(date), getToday());
}

// Format time from hours/mins
export function formatTime(hour, min) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'am' : 'pm';
  const m = String(min || 0).padStart(2, '0');
  return `${h}:${m}${ampm}`;
}

// Get greeting based on time of day
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Get current time period
export function getCurrentPeriod() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// Get period for a given hour
export function getPeriodForHour(hour) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Get energy period key for a given hour
export function getEnergyPeriod(hour) {
  if (hour < 11) return 'morning';
  if (hour < 13) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
}

// Sort items by time
export function sortByTime(items) {
  return [...items].sort((a, b) => {
    const aTime = (a.start_hour || a.recurring_start_hour || 0) * 60 + (a.start_min || a.recurring_start_min || 0);
    const bTime = (b.start_hour || b.recurring_start_hour || 0) * 60 + (b.start_min || b.recurring_start_min || 0);
    return aTime - bTime;
  });
}

// Check if a recurring item occurs on a given date
export function recurringOccursOnDate(item, date) {
  const dayOfWeek = date.getDay(); // 0=Sun
  // Convert to 0=Mon format
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  if (item.recurring_type === 'daily') return true;
  if (item.recurring_type === 'weekday') return dayIndex < 5;
  if (item.recurring_type === 'weekend') return dayIndex >= 5;
  if (item.recurring_type === 'weekly' && item.recurring_days) {
    return item.recurring_days.includes(dayIndex);
  }
  return false;
}

// Get the monday of the week containing a date
export function getWeekStart(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// Default pillars
export const DEFAULT_PILLARS = [
  { label: 'Family', icon: '👨‍👩‍👧‍👦', color: '#e8a87c', sub_pillars: ['Madden', 'Hardey', 'Noa', 'Quality Time'], order: 0 },
  { label: 'Film & Craft', icon: '🎬', color: '#00b4d8', sub_pillars: ['Pre-production', 'Production', 'Post-production', 'Learning'], order: 1 },
  { label: 'Business', icon: '🏢', color: '#9b6dce', sub_pillars: ['App Dev', 'Marketing', 'Admin', 'Strategy'], order: 2 },
  { label: 'Health', icon: '💚', color: '#4db88a', sub_pillars: ['Exercise', 'Diet', 'Mental Health', 'Sleep'], order: 3 },
  { label: 'Finance', icon: '💰', color: '#d4a843', sub_pillars: ['Budget', 'Invoices', 'Investments', 'Tax'], order: 4 },
  { label: 'Creativity', icon: '🎨', color: '#e07a5c', sub_pillars: ['Writing', 'Music', 'Design', 'Ideas'], order: 5 },
  { label: 'Growth', icon: '🌱', color: '#5b8dd9', sub_pillars: ['Reading', 'Courses', 'Networking', 'Reflection'], order: 6 },
];

// Default energy rhythm
export const DEFAULT_ENERGY = {
  morning: 'peak',
  midday: 'high',
  afternoon: 'medium',
  evening: 'low',
  night: 'low',
};

// Priority colors
export const PRIORITY_COLORS = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#6b7280',
};

// Emoji options for pillar edit
export const EMOJI_OPTIONS = [
  '👨‍👩‍👧‍👦', '🎬', '🏢', '💚', '💰', '🎨', '🌱', '❄️',
  '🎯', '📚', '🏋️', '🧘', '🎵', '✈️', '🏠', '💻',
  '📝', '🔬', '🎮', '🌍', '🤝', '📷', '🎤', '⚡',
  '📁', '🗂️', '📂', '🗃️', '📦', '🗄️', '📋', '🗒️',
];

// Color presets
export const COLOR_PRESETS = [
  '#e8a87c', '#00b4d8', '#9b6dce', '#4db88a', '#d4a843',
  '#e07a5c', '#5b8dd9', '#4a7fa0', '#ef4444', '#f59e0b',
  '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];