from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    async def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URI)
        self.db = self.client[settings.MONGODB_DB_NAME]
        print(f"[DB] Connected to MongoDB: {settings.MONGODB_DB_NAME}")

    async def disconnect(self):
        if self.client:
            self.client.close()
            print("[DB] Disconnected from MongoDB")

    # ── Collection accessors ───────────────────────────────────
    @property
    def users(self):
        return self.db["users"]

    @property
    def jobs(self):
        return self.db["jobs"]

    @property
    def skills_analytics(self):
        return self.db["skills_analytics"]

    @property
    def roles_analytics(self):
        return self.db["roles_analytics"]

    @property
    def regions_analytics(self):
        return self.db["regions_analytics"]

    @property
    def experience_analytics(self):
        return self.db["experience_analytics"]

    @property
    def summary(self):
        return self.db["summary"]

    @property
    def skills_by_role(self):
        return self.db["skills_by_role"]

# Singleton instance
database = Database()

def get_db() -> Database:
    return database
