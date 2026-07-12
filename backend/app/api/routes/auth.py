@router.post("/auth/login")
async def login(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).where(User.email == body.get("email")))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        if not verify_password(body.get("password", ""), user.password):
            raise HTTPException(status_code=401, detail="Wrong password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account inactive")

        token = create_access_token({"sub": str(user.id), "role": user.role})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
