import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAlertColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'critical':
      return 'text-red-400 bg-red-500/20 border-red-500';
    case 'high':
      return 'text-orange-400 bg-orange-500/20 border-orange-500';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
    case 'low':
      return 'text-green-400 bg-green-500/20 border-green-500';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500';
  }
}

export function getGradeColor(grade: string): string {
  switch (grade.toUpperCase()) {
    case 'A':
      return 'text-green-400';
    case 'B':
      return 'text-blue-400';
    case 'C':
      return 'text-yellow-400';
    case 'D':
      return 'text-orange-400';
    case 'F':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'resolved':
    case 'closed':
      return 'text-green-400 bg-green-500/20';
    case 'in_progress':
      return 'text-blue-400 bg-blue-500/20';
    case 'pending':
      return 'text-yellow-400 bg-yellow-500/20';
    case 'open':
      return 'text-orange-400 bg-orange-500/20';
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
