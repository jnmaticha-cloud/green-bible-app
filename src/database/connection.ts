// Database Connection Module
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export interface DatabaseConnection {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string, params?: any[]): Promise<any>;
}

export class SQLiteConnection implements DatabaseConnection {
    private dbPath: string;
    private db: Database | null = null;
    
    constructor(dbPath: string) {
        this.dbPath = dbPath;
    }
    
    async connect(): Promise<void> {
        if (this.db) return;
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        console.log(`Connected to SQLite database at ${this.dbPath}`);
    }
    
    async disconnect(): Promise<void> {
        if (!this.db) return;
        await this.db.close();
        this.db = null;
        console.log('Disconnected from database');
    }
    
    async query(sql: string, params?: any[]): Promise<any> {
        if (!this.db) await this.connect();
        return await this.db?.all(sql, params || []);
    }
}

export default SQLiteConnection;
