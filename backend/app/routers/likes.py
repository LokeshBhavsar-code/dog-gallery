from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.database import get_db
from app.models import Like

router = APIRouter(prefix="", tags=["Likes"])


class LikePayload(BaseModel):
    image_url: str
    breed: str


@router.post("/like")
async def like_image(payload: LikePayload, db: AsyncSession = Depends(get_db)):
    image_url = payload.image_url
    breed = payload.breed

    result = await db.execute(select(Like).where(Like.image_url == image_url))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Already liked")

    like = Like(image_url=image_url, breed=breed)
    db.add(like)
    await db.commit()

    return {"message": "Liked successfully"}


@router.delete("/like")
async def unlike_image(image_url: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Like).where(Like.image_url == image_url))
    await db.commit()

    return {"message": "Unliked successfully"}


@router.get("/likes")
async def get_likes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Like))
    likes = result.scalars().all()

    return [
        {"id": like.id, "image_url": like.image_url, "breed": like.breed}
        for like in likes
    ]
