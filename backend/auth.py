from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from database import get_session
from models import User, UserRegister, UserLogin
from security import hash_password, verify_password, create_token

router = APIRouter()

@router.post("/register", status_code=201)
def register(
    data: UserRegister,
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(User).where(User.username == data.username)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="This user already exists!",
        )

    new_user = User(
        username=data.username,
        password=hash_password(data.password),
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {"message": "Sign up successful!", "user_id": new_user.id}


@router.post("/login")
def login(
    data: UserLogin,
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == data.username)
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Username or password incorrect!",
        )

    if not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Username or password incorrect!",
        )

    token = create_token(user.id)

    return {"token": token, "message": "Welcome!"}