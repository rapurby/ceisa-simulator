from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, require_role
from app.models.user import User

router = APIRouter()

@router.post("/auth/login")
async def login(body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.get("email")))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.get("password", ""), user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role}}

@router.get("/auth/me")
async def me(current_user: User = Depends(require_role("admin", "officer"))):
    return {"id": str(current_user.id), "name": current_user.name,
            "email": current_user.email, "role": current_user.role}
