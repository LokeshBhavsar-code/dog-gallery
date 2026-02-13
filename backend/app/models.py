from sqlalchemy import Column, Integer, String
from app.database import Base
from sqlalchemy import DateTime
from datetime import datetime

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String, unique=True, index=True)
    breed = Column(String)

class ViewedBreed(Base):
    __tablename__ = "viewed_breeds"

    id = Column(Integer, primary_key=True, index=True)
    breed = Column(String, index=True)
    viewed_at = Column(DateTime, default=datetime.utcnow)
