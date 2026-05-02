import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: Optional[str] = None

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
