// Formatting utilities

/**
 * Format a number with appropriate suffixes (K, M, B, T, etc.)
 */
export function formatNumber(value: number): string {
  if (value < 0) return '-' + formatNumber(-value);
  if (value === 0) return '0';
  
  // For very small numbers, show more precision
  if (value < 0.01 && value > 0) {
    // Find appropriate precision
    if (value < 0.0001) return value.toExponential(1);
    if (value < 0.001) return value.toFixed(4);
    return value.toFixed(3);
  }
  
  if (value < 1000) return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0);
  
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const tier = Math.floor(Math.log10(value) / 3);
  
  if (tier >= suffixes.length) {
    // Use scientific notation for very large numbers
    return value.toExponential(2);
  }
  
  const scaled = value / Math.pow(1000, tier);
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffixes[tier];
}

/**
 * Format cash with $ prefix
 */
export function formatCash(value: number): string {
  return '$' + formatNumber(value);
}

/**
 * Format time in seconds to human readable format (short)
 * e.g., 1h 30m, 5m 20s
 */
export function formatTimeShort(seconds: number): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format time in seconds to full format
 * e.g., 1 hour 30 minutes, 5 minutes 20 seconds
 */
export function formatTimeFull(seconds: number): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  }
  
  return parts.join(' ');
}

/**
 * Format a timestamp to relative time
 * e.g., "2 hours ago", "in 5 minutes"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let result: string;
  
  if (days > 0) {
    result = `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    result = `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    result = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    result = `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  return diff < 0 ? `${result} ago` : `in ${result}`;
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

/**
 * Format a date to locale string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format a date and time to locale string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + 's');
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}
