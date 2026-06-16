import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import logging
import time
from database import create_db
import routes
import auth

# ------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("contact_manager")
# ------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()  
    yield

app = FastAPI(title="Contact Manager_v4", lifespan=lifespan)

# ------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------

# ------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "%s %s -> %s %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response
# ------------

@app.get("/")
def home():
    return {"message": "Welcome to your Contact Manager!"}


app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(routes.router, tags=["Contacts"])
