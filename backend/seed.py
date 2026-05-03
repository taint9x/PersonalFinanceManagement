import asyncio
import os
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def seed_initial_user():
    print("Checking if initial user exists...")
    username = os.getenv("INITIAL_USERNAME", "admin")
    password = os.getenv("INITIAL_PASSWORD", "changeme_on_first_login")
    
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User '{username}' already exists. Skipping creation.")
            return

        print(f"Creating initial user: {username}")
        new_user = User(
            username=username,
            hashed_password=get_password_hash(password),
            email=None
        )
        session.add(new_user)
        await session.commit()
        print(f"User '{username}' created successfully.")

if __name__ == "__main__":
    asyncio.run(seed_initial_user())
