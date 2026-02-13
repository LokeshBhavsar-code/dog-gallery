from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.routers import breeds, likes
from app.database import engine, Base
from app.routers import viewed

app = FastAPI(title="Dog Gallery API")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(breeds.router)
app.include_router(likes.router)
app.include_router(viewed.router)


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/page/breed/{breed}")
async def breed_page(request: Request, breed: str):
    return templates.TemplateResponse("breed.html", {"request": request, "breed": breed})

@app.get("/likes-page")
async def likes_page(request: Request):
    return templates.TemplateResponse("likes.html", {"request": request})
