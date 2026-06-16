import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
from database import get_session
import models
import os
from dotenv import load_dotenv

# Load .env relative to this file
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

if not SECRET_KEY:
    raise ValueError("SECRET_KEY is missing")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

security_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    session: Session = Depends(get_session),
):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired!")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token!")

    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found!")
    return user

def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])