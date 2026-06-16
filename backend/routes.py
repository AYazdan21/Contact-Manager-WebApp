from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_
from database import get_session
from models import (
    Category,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    Contact,
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    User,
)
from security import get_current_user
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

router = APIRouter()

UNSUPPORTED_REGIONS = [
    {"code": "+850", "country": "North Korea"},
]

def check_region(phone: str):
    for region in UNSUPPORTED_REGIONS:
        if phone.startswith(region["code"]):
            return False, region["country"]
    return True, None


@router.get("/contacts", response_model=List[ContactResponse])
def get_contacts(
    name: Optional[str] = None,
    city: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    # ------------
    category_id: Optional[int] = None,
    # ------------
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):

    statement = select(Contact).where(Contact.user_id == current_user.id)
    
    if name: statement = statement.where(Contact.name.contains(name))
    if city: statement = statement.where(Contact.city.contains(city))
    if phone: statement = statement.where(Contact.phone.contains(phone))
    if email: statement = statement.where(Contact.email.contains(email))
    # ------------
    if category_id is not None: statement = statement.where(Contact.category_id == category_id)
    # ------------
    
    return session.exec(statement).all()


@router.get("/contacts/id/{contact_id}", response_model=ContactResponse)
def get_contact_by_id(
    contact_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)
    contact = session.exec(statement).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/contacts/favorites", response_model=List[ContactResponse])
def get_favorites(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Contact).where(
        Contact.is_favorite == True, 
        Contact.user_id == current_user.id
    )
    results = session.exec(statement).all()
    if not results:
        raise HTTPException(status_code=404, detail="No favorites found")
    return results


# ------------
@router.get("/categories/{category_id}/contacts", response_model=List[ContactResponse])
def get_contacts_by_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    category = session.exec(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    statement = select(Contact).where(
        Contact.category_id == category_id,
        Contact.user_id == current_user.id,
    )
    return session.exec(statement).all()
# ------------


@router.post("/contacts", status_code=201, response_model=ContactResponse)
def create_contact(
    data: ContactCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    is_supported, country = check_region(data.phone)
    if not is_supported:
        raise HTTPException(status_code=403, detail=f"Not available in {country}")

    # ------------
    if data.category_id is not None:
        category = session.exec(
            select(Category).where(
                Category.id == data.category_id,
                Category.user_id == current_user.id,
            )
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    # ------------
    
    new_contact = Contact.model_validate(data, update={"user_id": current_user.id})
    session.add(new_contact)
    session.commit()
    session.refresh(new_contact)
    return new_contact


@router.patch("/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int, 
    data: ContactUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)
    contact = session.exec(statement).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if data.phone:
        is_supported, country = check_region(data.phone)
        if not is_supported:
            raise HTTPException(status_code=403, detail=f"Cannot set to {country} number. Check privacy policy.")

    update_data = data.model_dump(exclude_unset=True)
    # ------------
    if "category_id" in update_data and update_data["category_id"] is not None:
        category = session.exec(
            select(Category).where(
                Category.id == update_data["category_id"],
                Category.user_id == current_user.id,
            )
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    # ------------
    contact.sqlmodel_update(update_data)
    contact.updated_at = datetime.now(ZoneInfo("Asia/Tehran"))

    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.post("/contacts/{contact_id}/favorite")
def toggle_favorite(
    contact_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)
    contact = session.exec(statement).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.is_favorite = not contact.is_favorite
    contact.updated_at = datetime.now(ZoneInfo("Asia/Tehran"))

    session.add(contact)
    session.commit()
    session.refresh(contact)
    
    status = "added to" if contact.is_favorite else "removed from"
    return {"message": f"{contact.name} {status} favorites"}


@router.delete("/contacts/{identifier}")
def delete_contact(
    identifier: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Contact).where(Contact.user_id == current_user.id)

    if identifier.isdigit():
        statement = statement.where(Contact.id == int(identifier))
    elif "@" in identifier:
        statement = statement.where(Contact.email == identifier)
    else:
        statement = statement.where(Contact.phone == identifier)
    
    contact = session.exec(statement).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    session.delete(contact)
    session.commit()
    return {"message": "Contact removed successfully!"}


# ------------
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Category).where(Category.user_id == current_user.id)
    return session.exec(statement).all()


@router.post("/categories", status_code=201, response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    category = Category.model_validate(data, update={"user_id": current_user.id})
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    category = session.exec(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.sqlmodel_update(data.model_dump(exclude_unset=True))
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    category = session.exec(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    contacts = session.exec(
        select(Contact).where(Contact.category_id == category.id, Contact.user_id == current_user.id)
    ).all()
    for contact in contacts:
        contact.category_id = None
        contact.updated_at = datetime.now(ZoneInfo("Asia/Tehran"))
        session.add(contact)

    session.delete(category)
    session.commit()
    return {"message": "Category removed successfully!"}
# ------------


@router.get("/privacyPolicy")
def get_privacy_policy():
    return {
        "message": "This application is not available in the following regions:",
        "unsupported_regions": UNSUPPORTED_REGIONS
    }
