from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc
from pydantic import BaseModel

from app.database import get_db
from app.models import ViewedBreed

router = APIRouter(tags=["Viewed"])


class ViewedRequest(BaseModel):
    breed: str


@router.post("/viewed")
async def add_viewed(payload: ViewedRequest, db: AsyncSession = Depends(get_db)):

    breed = payload.breed

    await db.execute(delete(ViewedBreed).where(ViewedBreed.breed == breed))

    new_view = ViewedBreed(breed=breed)
    db.add(new_view)
    await db.commit()

    result = await db.execute(select(ViewedBreed).order_by(desc(ViewedBreed.viewed_at)))
    views = result.scalars().all()

    if len(views) > 5:
        for v in views[5:]:
            await db.delete(v)
        await db.commit()

    return {"message": "Viewed updated"}


@router.get("/viewed")
async def get_viewed(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ViewedBreed).order_by(desc(ViewedBreed.viewed_at)).limit(5)
    )
    views = result.scalars().all()

    return [v.breed for v in views]
