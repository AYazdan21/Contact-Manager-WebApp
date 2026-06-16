# 📞 Contact Manager WebApp

A modern, responsive, and secure full-stack contact management application. It features user registration and login, JWT-based authentication, category grouping, advanced contact search and filtering, and privacy compliance rules.

---

## 🚀 Key Features

*   **🔒 Secure Authentication**: Multi-user support with registration, bcrypt password hashing, and stateful/JWT-based session management.
*   **📂 Grouping & Categories**: Organize your contacts into custom categories (e.g., *Work*, *Family*, *Friends*).
*   **🔍 Advanced Search & Filter**: Find contacts instantly by filtering by name, email, phone, city, or category.
*   **⭐️ Favorites System**: Quickly bookmark/favorite contacts and access them via a dedicated filter.
*   **🌍 Privacy Compliance & Validation**:
    *   Ensures all phone numbers use valid international formats (e.g., `+98...`).
    *   Strict region blocking: Automatically denies registration of contacts from unsupported regions (e.g., USA `+1`, North Korea `+850`) in compliance with system privacy policies.

---

## 🛠️ Tech Stack

### Backend
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (combining SQLAlchemy & Pydantic)
*   **Database**: SQLite (SQL-based relational database)
*   **Security**: PyJWT (JSON Web Tokens) & Bcrypt (Password Hashing)

### Frontend
*   **Framework**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite](https://vite.dev/)
*   **Styling**: Vanilla CSS (Tailored UI styling with fluid transitions and responsive layouts)

---

## 📂 Project Structure

```text
├── backend/
│   ├── .env.example          # Template for backend environment variables
│   ├── auth.py               # Authentication routes (login, register)
│   ├── database.py           # Database engine & session creation
│   ├── main.py               # FastAPI entry point, lifespan, & CORS middleware
│   ├── models.py             # SQLModel database schemas (User, Contact, Category)
│   ├── requirements.txt      # Python dependencies
│   ├── routes.py             # Main application endpoints (CRUD contacts/categories)
│   ├── security.py           # Password hashing & JWT helpers
│   └── view_db.py            # Utility script to inspect the database locally
│
└── frontend/
    ├── src/
    │   ├── api.js            # API request wrapper using Fetch API
    │   ├── App.jsx           # Main React component containing UI & state
    │   ├── App.css           # Styling rules for App component
    │   ├── index.css         # Global styles and design variables
    │   └── main.jsx          # React entry point
    ├── index.html            # Entry HTML template
    ├── package.json          # Frontend packages & script definitions
    └── vite.config.js        # Vite configurations
```

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Python 3.10+](https://www.python.org/)
*   [Node.js 18+](https://nodejs.org/)

---

### 2. Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    *   **Windows (CMD/PowerShell)**:
        ```bash
        python -m venv env1
        .\env1\Scripts\activate
        ```
    *   **macOS/Linux**:
        ```bash
        python3 -m venv env1
        source env1/bin/activate
        ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure Environment Variables:
    *   Copy the `.env.example` template:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and set a secure `SECRET_KEY` for JWT signatures:
        ```env
        SECRET_KEY=your_super_secret_jwt_key
        DATABASE_URL=sqlite:///database.db
        ```
5.  Start the FastAPI development server:
    ```bash
    uvicorn main:app --reload
    ```
    *   The backend will be running at `http://localhost:8000`.
    *   You can access the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.

---

### 3. Frontend Setup
1.  Navigate to the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Configure API Endpoint:
    *   Create a `.env` file in the `frontend` directory (optional if using the default `http://localhost:8000` backend URL):
        ```env
        VITE_API_URL=http://localhost:8000
        ```
4.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    *   The frontend will be running at `http://localhost:5173`. Open this URL in your web browser.

---

## 🔌 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Login and retrieve a JWT access token |

### Contacts Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/contacts` | Fetch all user contacts (supports filters: name, city, phone, email, category_id) |
| `POST` | `/contacts` | Create a new contact |
| `GET` | `/contacts/id/{contact_id}` | Fetch a contact by its ID |
| `PATCH` | `/contacts/{contact_id}` | Update a contact's details |
| `DELETE` | `/contacts/{identifier}` | Remove a contact (by ID, email, or phone) |
| `GET` | `/contacts/favorites` | Fetch favorited contacts |
| `POST` | `/contacts/{contact_id}/favorite` | Toggle the favorite status of a contact |

### Category Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/categories` | Fetch all categories created by the user |
| `POST` | `/categories` | Create a new category |
| `PATCH` | `/categories/{category_id}` | Update a category name |
| `DELETE` | `/categories/{category_id}` | Delete a category (resets contacts in it to no category) |

### System Policies
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/privacyPolicy` | Retrieve the unsupported regions list |

---

## 🔒 Security & Privacy Logic
*   **Authentication**: Every request to a protected endpoint must include the `Authorization: Bearer <JWT_TOKEN>` header.
*   **Country Restriction**: The server checks the starting digits of the phone number when creating or updating a contact:
    *   If it matches `+1` (USA) or `+850` (North Korea), the API responds with a `403 Forbidden` status code, preventing registration to comply with local privacy rules.
*   **Phone Validation**: All phone inputs must match international standards `^\+?[1-9]\d{1,14}$`.
