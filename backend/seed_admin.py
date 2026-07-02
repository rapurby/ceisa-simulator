"""
Run once to create the default CEISA admin account.
Usage: python seed_admin.py
"""
import asyncio
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User

async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        existing = await db.execute(select(User).where(User.email == "admin@ceisa.go.id"))
        if existing.scalar_one_or_none():
            print("Admin already exists.")
            return
        user = User(
            name="Admin CEISA",
            email="admin@ceisa.go.id",
            password=hash_password("ceisa2026"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print("✅ Admin created: admin@ceisa.go.id / ceisa2026")

asyncio.run(seed())
