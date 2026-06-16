from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy import text
import os
from dotenv import load_dotenv
import models  


# Load .env relative to this file
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(base_dir, 'database.db')}"
elif DATABASE_URL.startswith("sqlite:///"):
    db_file = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_file):
        db_path = os.path.join(base_dir, db_file).replace("\\", "/")
        DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(DATABASE_URL, echo=True)

def create_db():
    SQLModel.metadata.create_all(engine)
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(contact)")).fetchall()
        if not any(column[1] == "category_id" for column in columns):
            connection.execute(text("ALTER TABLE contact ADD COLUMN category_id INTEGER"))

def get_session():
    with Session(engine) as session:
        yield session
