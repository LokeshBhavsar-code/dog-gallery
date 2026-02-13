from os import getenv

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = getenv("DATABASE_URL", "sqlite+aiosqlite:///./doggallery.db")
DB_ECHO = getenv("DB_ECHO", "false").lower() == "true"

engine = create_async_engine(DATABASE_URL, echo=DB_ECHO)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session