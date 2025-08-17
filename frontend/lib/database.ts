import sqlite3 from 'sqlite3';
import path from 'path';

interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt?: string;
}

interface UserToken {
  id: string;
  userId: string;
  clerkId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeTables();
  }

  // Helper methods to promisify SQLite3 operations
  private runAsync(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  private getAsync(sql: string, params: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allAsync(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private async initializeTables() {
    try {
      // Create users table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          clerkId TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          firstName TEXT,
          lastName TEXT,
          imageUrl TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          lastSignInAt TEXT
        )
      `);

      // Create user_tokens table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS user_tokens (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          clerkId TEXT NOT NULL,
          token TEXT NOT NULL,
          expiresAt TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (clerkId) REFERENCES users (clerkId)
        )
      `);

      // Create indexes for better performance
      await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerkId)`);
      await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`);
      await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON user_tokens (userId)`);
      await this.runAsync(`CREATE INDEX IF NOT EXISTS idx_tokens_clerk_id ON user_tokens (clerkId)`);
      
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
    }
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.runAsync(`
        INSERT INTO users (id, clerkId, email, firstName, lastName, imageUrl, createdAt, updatedAt, lastSignInAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        user.clerkId,
        user.email,
        user.firstName,
        user.lastName,
        user.imageUrl,
        user.createdAt,
        user.updatedAt,
        user.lastSignInAt,
      ]);

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserByClerkId(clerkId: string): Promise<User | null> {
    try {
      const user = await this.getAsync('SELECT * FROM users WHERE clerkId = ?', [clerkId]) as User;
      return user || null;
    } catch (error) {
      console.error('Error getting user by Clerk ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.getAsync('SELECT * FROM users WHERE email = ?', [email]) as User;
      return user || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async updateUser(clerkId: string, updateData: Partial<Omit<User, 'id' | 'clerkId' | 'createdAt'>>): Promise<User | null> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    // Build dynamic update query
    Object.entries({ ...updateData, updatedAt: now }).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.getUserByClerkId(clerkId);
    }

    values.push(clerkId);

    try {
      await this.runAsync(`UPDATE users SET ${updates.join(', ')} WHERE clerkId = ?`, values);
      return this.getUserByClerkId(clerkId);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async upsertUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const existingUser = await this.getUserByClerkId(userData.clerkId);
    
    if (existingUser) {
      const updatedUser = await this.updateUser(userData.clerkId, {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        lastSignInAt: userData.lastSignInAt,
      });
      return updatedUser!;
    } else {
      return this.createUser(userData);
    }
  }

  // Token operations
  async createUserToken(tokenData: Omit<UserToken, 'id' | 'createdAt'>): Promise<UserToken> {
    const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const userToken: UserToken = {
      id: tokenId,
      ...tokenData,
      createdAt: now,
    };

    try {
      await this.runAsync(`
        INSERT INTO user_tokens (id, userId, clerkId, token, expiresAt, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userToken.id,
        userToken.userId,
        userToken.clerkId,
        userToken.token,
        userToken.expiresAt,
        userToken.createdAt,
      ]);

      return userToken;
    } catch (error) {
      console.error('Error creating user token:', error);
      throw new Error('Failed to create user token');
    }
  }

  async getUserToken(clerkId: string): Promise<UserToken | null> {
    try {
      // Get the most recent valid token
      const token = await this.getAsync(`
        SELECT * FROM user_tokens 
        WHERE clerkId = ? AND datetime(expiresAt) > datetime('now')
        ORDER BY createdAt DESC 
        LIMIT 1
      `, [clerkId]) as UserToken;
      
      return token || null;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    try {
      await this.runAsync(`DELETE FROM user_tokens WHERE datetime(expiresAt) <= datetime('now')`);
    } catch (error) {
      console.error('Error deleting expired tokens:', error);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.allAsync('SELECT * FROM users ORDER BY createdAt DESC') as User[];
      return users || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Close database connection
  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

export type { User, UserToken };
