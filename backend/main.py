from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import h2h, declarations, auth
from app.core.database import init_db
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="CEISA Simulator API",
    description="Simulasi sistem CEISA Bea Cukai — menerima deklarasi dari CDP via H2H",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(h2h.router)                              # public H2H endpoint
app.include_router(auth.router,         prefix="/api/v1")
app.include_router(declarations.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"app": "CEISA Simulator", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
