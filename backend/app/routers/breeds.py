from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.database import get_db
from app.models import Like, ViewedBreed



from fastapi import APIRouter, Query, HTTPException
from app.services.dog_api import fetch_all_breeds, fetch_breed_images

router = APIRouter(prefix="", tags=["Breeds"])


@router.get("/breeds")
async def get_breeds(
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
):
    breeds = await fetch_all_breeds()

    if search:
        breeds = [b for b in breeds if search.lower() in b.lower()]

    total = len(breeds)

    start = (page - 1) * limit
    end = start + limit

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "breeds": breeds[start:end],
    }


@router.get("/breed/{breed}")
async def breed_detail(
    breed: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
):
    try:
        images = await fetch_breed_images(breed)
    except:
        raise HTTPException(status_code=404, detail="Breed not found")

    total = len(images)

    start = (page - 1) * limit
    end = start + limit

    return {
        "breed": breed,
        "total_images": total,
        "page": page,
        "limit": limit,
        "images": images[start:end],
    }
@router.get("/breeds/liked")
async def liked_breeds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Like.breed).distinct()
    )
    return result.scalars().all()


@router.get("/breeds/viewed")
async def viewed_breeds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ViewedBreed.breed).distinct()
    )
    return result.scalars().all()

@router.get("/breeds/most-liked")
async def most_liked_breeds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Like.breed,
            func.count(Like.id).label("total_likes")
        )
        .group_by(Like.breed)
        .order_by(func.count(Like.id).desc())
    )

    rows = result.all()

    return [
        {"breed": row[0], "likes": row[1]}
        for row in rows
    ]
