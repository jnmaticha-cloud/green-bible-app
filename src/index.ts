// Green Bible App - TypeScript Source Entry Point
// Main application logic and type definitions

// Export all modules
export * from './database/index.js';
export * from './middleware/index.js';
export * from './routes/index.js';

// Main application class
export class BibleApplication {
    private config: AppConfig;
    
    constructor(config: AppConfig) {
        this.config = config;
    }
    
    async initialize(): Promise<void> {
        console.log('Initializing Bible Application...');
        // Initialization logic
    }
}

export interface AppConfig {
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    environment: 'development' | 'production' | 'test';
}

export const defaultConfig: AppConfig = {
    port: 3000,
    databaseUrl: process.env.DATABASE_URL || 'sqlite:./bible.db',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
    environment: (process.env.NODE_ENV as any) || 'development'
};

// Re-export types
export type { DatabaseConnection } from './database/connection.js';
export type { AuthenticatedRequest } from './middleware/authentication.js';
