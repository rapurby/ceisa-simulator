from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import h2h, declarations, auth
from app.core.database import init_db, AsyncSessionLocal
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def _seed_admin():
    """Create default admin account if none exists."""
    # Import models here so they're registered with Base before create_all
    from app.models.user import User
    from app.models.declaration import IncomingDeclaration  # noqa
    from app.core.security import hash_password
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@ceisa.go.id"))
        if existing.scalar_one_or_none():
            return
        admin = User(
            name="Admin CEISA",
            email="admin@ceisa.go.id",
            password=hash_password("ceisa2026"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        logger.info("✅ Admin CEISA created: admin@ceisa.go.id / ceisa2026")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import models before create_all so tables are registered
    from app.models import user, declaration  # noqa
    await init_db()
    try:
        await _seed_admin()
    except Exception as e:
        # Jangan biarkan kegagalan seed mematikan startup (bikin deploy
        # gagal healthcheck) — log keras supaya kelihatan di Railway logs.
        logger.error(f"❌ Seed admin FAILED (login tidak akan bisa sampai ini dibereskan): {e}")
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
