/**
 * Centralized logging utility with configurable log levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private seenMessages = new Map<string, number>();
  private dedupeWindow = 5000; // 5 seconds

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel, message: string, dedupe = false): boolean {
    if (level > this.level) return false;
    
    if (dedupe) {
      const now = Date.now();
      const lastSeen = this.seenMessages.get(message);
      if (lastSeen && now - lastSeen < this.dedupeWindow) {
        return false;
      }
      this.seenMessages.set(message, now);
    }
    
    return true;
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR, message)) {
      console.error(message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN, message)) {
      console.warn(message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO, message)) {
      console.log(message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG, message)) {
      console.log(message, ...args);
    }
  }

  verbose(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.VERBOSE, message)) {
      console.log(message, ...args);
    }
  }

  // Deduplicated logging - won't log same message within time window
  infoDedupe(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO, message, true)) {
      console.log(message, ...args);
    }
  }

  debugDedupe(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG, message, true)) {
      console.log(message, ...args);
    }
  }
}

export const logger = new Logger();

// Set log level from environment or localStorage
const storedLevel = localStorage.getItem('LOG_LEVEL');
if (storedLevel) {
  logger.setLevel(parseInt(storedLevel) as LogLevel);
} else if (import.meta.env.DEV) {
  logger.setLevel(LogLevel.INFO); // Default to INFO in dev
} else {
  logger.setLevel(LogLevel.WARN); // Only warnings and errors in production
}

// Expose to window for easy debugging
(window as any).setLogLevel = (level: LogLevel) => {
  logger.setLevel(level);
  localStorage.setItem('LOG_LEVEL', level.toString());
  console.log(`Log level set to: ${LogLevel[level]}`);
};

(window as any).LogLevel = LogLevel;
