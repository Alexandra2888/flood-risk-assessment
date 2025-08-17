"""
Database service for user management
Clean, async implementation following SOLID principles
"""
import aiosqlite
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from app.models.schemas import User, UserToken
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    """Singleton database service with proper async connection management"""
    
    _instance: Optional['DatabaseService'] = None
    _db_path: str = "app_database.db"
    
    def __new__(cls) -> 'DatabaseService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def initialize(self) -> None:
        """Initialize database tables"""
        try:
            async with aiosqlite.connect(self._db_path) as db:
                # Create users table
                await db.execute("""
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
                """)
                
                # Create user_tokens table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_tokens (
                        id TEXT PRIMARY KEY,
                        userId TEXT NOT NULL,
                        clerkId TEXT NOT NULL,
                        token TEXT UNIQUE NOT NULL,
                        expiresAt TEXT NOT NULL,
                        createdAt TEXT NOT NULL,
                        FOREIGN KEY (userId) REFERENCES users (id),
                        FOREIGN KEY (clerkId) REFERENCES users (clerkId)
                    )
                """)
                
                # Create indexes
                await db.execute("CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerkId)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON user_tokens (userId)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_tokens_clerk_id ON user_tokens (clerkId)")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_tokens_token ON user_tokens (token)")
                
                await db.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    async def create_user(self, user_data: dict) -> User:
        """Create a new user"""
        user_id = f"user_{secrets.token_urlsafe(16)}"
        now = datetime.utcnow().isoformat()
        
        user = User(
            id=user_id,
            clerkId=user_data["clerkId"],
            email=user_data["email"],
            firstName=user_data.get("firstName"),
            lastName=user_data.get("lastName"),
            imageUrl=user_data.get("imageUrl"),
            createdAt=now,
            updatedAt=now,
            lastSignInAt=user_data.get("lastSignInAt", now)
        )
        
        try:
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute("""
                    INSERT INTO users (id, clerkId, email, firstName, lastName, imageUrl, createdAt, updatedAt, lastSignInAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user.id, user.clerkId, user.email, user.firstName, 
                    user.lastName, user.imageUrl, user.createdAt, user.updatedAt, user.lastSignInAt
                ))
                await db.commit()
                logger.info(f"User created successfully: {user.email}")
                return user
                
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise

    async def get_user_by_clerk_id(self, clerk_id: str) -> Optional[User]:
        """Get user by Clerk ID"""
        try:
            async with aiosqlite.connect(self._db_path) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT * FROM users WHERE clerkId = ?", (clerk_id,)) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        return User(**dict(row))
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get user by Clerk ID: {e}")
            return None

    async def update_user(self, clerk_id: str, update_data: dict) -> Optional[User]:
        """Update user data"""
        now = datetime.utcnow().isoformat()
        
        # Build dynamic update query
        fields = []
        values = []
        
        for key, value in update_data.items():
            if value is not None and key != "clerkId":  # Don't update clerkId
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            return await self.get_user_by_clerk_id(clerk_id)
        
        # Add updatedAt
        fields.append("updatedAt = ?")
        values.append(now)
        values.append(clerk_id)  # For WHERE clause
        
        try:
            async with aiosqlite.connect(self._db_path) as db:
                query = f"UPDATE users SET {', '.join(fields)} WHERE clerkId = ?"
                await db.execute(query, values)
                await db.commit()
                logger.info(f"User updated successfully: {clerk_id}")
                return await self.get_user_by_clerk_id(clerk_id)
                
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return None

    async def upsert_user(self, user_data: dict) -> User:
        """Create or update user"""
        existing_user = await self.get_user_by_clerk_id(user_data["clerkId"])
        
        if existing_user:
            updated_user = await self.update_user(user_data["clerkId"], {
                "email": user_data["email"],
                "firstName": user_data.get("firstName"),
                "lastName": user_data.get("lastName"),
                "imageUrl": user_data.get("imageUrl"),
                "lastSignInAt": user_data.get("lastSignInAt", datetime.utcnow().isoformat())
            })
            if not updated_user:
                raise Exception("Failed to update user")
            return updated_user
        else:
            return await self.create_user(user_data)

    async def create_user_token(self, user_id: str, clerk_id: str, expires_in_minutes: int = 1440) -> UserToken:
        """Create authentication token"""
        token_id = f"token_{secrets.token_urlsafe(16)}"
        token = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=expires_in_minutes)
        
        user_token = UserToken(
            id=token_id,
            userId=user_id,
            clerkId=clerk_id,
            token=token,
            expiresAt=expires_at.isoformat(),
            createdAt=now.isoformat()
        )
        
        try:
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute("""
                    INSERT INTO user_tokens (id, userId, clerkId, token, expiresAt, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_token.id, user_token.userId, user_token.clerkId,
                    user_token.token, user_token.expiresAt, user_token.createdAt
                ))
                await db.commit()
                logger.info(f"Token created for user: {clerk_id}")
                return user_token
                
        except Exception as e:
            logger.error(f"Failed to create token: {e}")
            raise

    async def get_valid_token(self, clerk_id: str) -> Optional[UserToken]:
        """Get valid token for user"""
        try:
            async with aiosqlite.connect(self._db_path) as db:
                db.row_factory = aiosqlite.Row
                now = datetime.utcnow().isoformat()
                async with db.execute("""
                    SELECT * FROM user_tokens 
                    WHERE clerkId = ? AND expiresAt > ?
                    ORDER BY createdAt DESC 
                    LIMIT 1
                """, (clerk_id, now)) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        return UserToken(**dict(row))
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get token: {e}")
            return None

    async def verify_token(self, token: str) -> Optional[User]:
        """Verify token and return associated user"""
        try:
            async with aiosqlite.connect(self._db_path) as db:
                db.row_factory = aiosqlite.Row
                now = datetime.utcnow().isoformat()
                
                # Get token info
                async with db.execute("""
                    SELECT ut.*, u.* FROM user_tokens ut
                    JOIN users u ON ut.userId = u.id
                    WHERE ut.token = ? AND ut.expiresAt > ?
                """, (token, now)) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        user_data = {k: row[k] for k in row.keys() if k in [
                            'id', 'clerkId', 'email', 'firstName', 'lastName', 
                            'imageUrl', 'createdAt', 'updatedAt', 'lastSignInAt'
                        ]}
                        return User(**user_data)
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to verify token: {e}")
            return None

    async def cleanup_expired_tokens(self) -> None:
        """Remove expired tokens"""
        try:
            async with aiosqlite.connect(self._db_path) as db:
                now = datetime.utcnow().isoformat()
                result = await db.execute("DELETE FROM user_tokens WHERE expiresAt <= ?", (now,))
                await db.commit()
                logger.info(f"Cleaned up {result.rowcount} expired tokens")
                
        except Exception as e:
            logger.error(f"Failed to cleanup tokens: {e}")

# Singleton instance
database_service = DatabaseService()
