import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from pydantic import EmailStr, field_validator

def get_iran_time():
    return datetime.now(ZoneInfo("Asia/Tehran"))


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password: str
    contacts: List["Contact"] = Relationship(back_populates="owner")
    # ------------
    categories: List["Category"] = Relationship(back_populates="owner")
    # ------------

# ------------
class CategoryBase(SQLModel):
    name: str = Field(index=True)

class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    owner: User = Relationship(back_populates="categories")
    contacts: List["Contact"] = Relationship(back_populates="category")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(SQLModel):
    name: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    user_id: int
# ------------

class UserRegister(SQLModel):
    username: str
    password: str

class UserLogin(SQLModel):
    username: str
    password: str




class ContactBase(SQLModel):
    name: str = Field(index=True)
    email: EmailStr = Field(unique=True, index=True)
    phone: str = Field(unique=True)
    city: str
    is_favorite: bool = False
    # ------------
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    # ------------

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str):
        if not re.match(r"^\+?[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in international format (e.g., +98...)")
        return v

class Contact(ContactBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=get_iran_time)
    updated_at: datetime = Field(default_factory=get_iran_time)
    user_id: int = Field(foreign_key="user.id")
    owner: User = Relationship(back_populates="contacts")
    # ------------
    category: Optional[Category] = Relationship(back_populates="contacts")
    # ------------

class ContactCreate(ContactBase):
    pass

class ContactUpdate(SQLModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    is_favorite: Optional[bool] = None
    # ------------
    category_id: Optional[int] = None
    # ------------

class ContactResponse(ContactBase):
    id: int
    created_at: datetime
    updated_at: datetime
    user_id: int
