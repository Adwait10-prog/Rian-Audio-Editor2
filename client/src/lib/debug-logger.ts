export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  constructor() {
    // Enable debug logging in development
    if (process.env.NODE_ENV === 'development') {
      this.logLevel = LogLevel.TRACE;
      console.log('🔍 [Debug Logger] Initialized in development mode');
    }
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    console.log(`🔍 [Debug Logger] Log level set to: ${LogLevel[level]}`);
  }

  private addLog(level: LogLevel, component: string, message: string, data?: any) {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Console output with proper formatting
    const levelEmoji = ['💥', '⚠️', 'ℹ️', '🔧', '📊'][level];
    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString().split('T')[1].split('.')[0];
    
    const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                         level === LogLevel.WARN ? 'warn' : 'log';
    
    if (data !== undefined) {
      console[consoleMethod](`${levelEmoji} [${timestamp}] [${component}] ${message}`, data);
    } else {
      console[consoleMethod](`${levelEmoji} [${timestamp}] [${component}] ${message}`);
    }
  }

  error(component: string, message: string, data?: any) {
    this.addLog(LogLevel.ERROR, component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.addLog(LogLevel.WARN, component, message, data);
  }

  info(component: string, message: string, data?: any) {
    this.addLog(LogLevel.INFO, component, message, data);
  }

  debug(component: string, message: string, data?: any) {
    this.addLog(LogLevel.DEBUG, component, message, data);
  }

  trace(component: string, message: string, data?: any) {
    this.addLog(LogLevel.TRACE, component, message, data);
  }

  // Audio-specific logging methods
  audioEvent(component: string, event: string, time?: number, data?: any) {
    const message = time !== undefined ? 
      `${event} at ${time.toFixed(3)}s` : 
      event;
    this.debug(component, `🎵 ${message}`, data);
  }

  videoEvent(component: string, event: string, time?: number, data?: any) {
    const message = time !== undefined ? 
      `${event} at ${time.toFixed(3)}s` : 
      event;
    this.debug(component, `🎥 ${message}`, data);
  }

  timelineEvent(component: string, event: string, data?: any) {
    this.debug(component, `⏰ ${event}`, data);
  }

  // Get recent logs
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by component
  getLogsByComponent(component: string, count = 50): LogEntry[] {
    return this.logs
      .filter(log => log.component === component)
      .slice(-count);
  }

  // Subscribe to new log entries
  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clear() {
    this.logs = [];
    this.info('Debug Logger', 'Logs cleared');
  }

  // Performance timing
  private timers = new Map<string, number>();

  startTimer(name: string) {
    this.timers.set(name, performance.now());
    this.trace('Performance', `Timer started: ${name}`);
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn('Performance', `Timer not found: ${name}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.debug('Performance', `Timer ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

// Global instance
export const logger = new DebugLogger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Global', 'Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Global', 'Unhandled promise rejection', {
    reason: event.reason
  });
});

// Performance monitoring
if (typeof PerformanceObserver !== 'undefined') {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) { // Only log slow operations
          logger.debug('Performance', `Slow ${entry.entryType}: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      }
    });
    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
  } catch (err) {
    console.warn('Performance monitoring not available');
  }
}