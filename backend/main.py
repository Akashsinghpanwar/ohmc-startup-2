"""
OHMC CarbonOS API — Neon PostgreSQL backend
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from api.routes import eligibility, parcels, projects, carbon, monitoring, auth, marketplace
from db import init_db, close_pool

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Connecting to Neon PostgreSQL...")
    await init_db()
    logger.info("Database ready")
    yield
    # Shutdown
    await close_pool()
    logger.info("Database pool closed")


app = FastAPI(
    title="OHMC CarbonOS API",
    version="1.0.0",
    lifespan=lifespan,
    description="Real Sentinel-2 + SoilGrids + Neon PostgreSQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",          tags=["Auth"])
app.include_router(eligibility.router,  prefix="/api/eligibility",   tags=["Eligibility"])
app.include_router(parcels.router,      prefix="/api/parcels",       tags=["Parcels"])
app.include_router(projects.router,     prefix="/api/projects",      tags=["Projects"])
app.include_router(carbon.router,       prefix="/api/carbon",        tags=["Carbon"])
app.include_router(monitoring.router,   prefix="/api/monitoring",    tags=["Monitoring"])
app.include_router(marketplace.router, prefix="/api/marketplace",   tags=["Marketplace"])


@app.get("/api/health")
async def health():
    from db.pool import get_pool
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            version = await conn.fetchval("SELECT version()")
        return {"status": "ok", "db": "neon_postgresql", "pg_version": version[:40]}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "db_error", "detail": str(e)})


@app.get("/")
async def root():
    return {
        "name": "OHMC CarbonOS API",
        "docs": "/docs",
        "health": "/api/health",
        "db": "Neon PostgreSQL",
    }
