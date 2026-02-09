from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

class DocumentStatus(str, Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    VOIDED = "VOIDED"

class AccountType(str, Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

# --- Account Schemas ---
class AccountBase(BaseModel):
    code: str
    name: str
    type: AccountType
    is_group: bool = False
    parent_id: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str

# --- Item Schemas ---
class ItemBase(BaseModel):
    sku: str
    name: str
    unit: str
    inventory_account_id: str
    cogs_account_id: str
    revenue_account_id: str

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: str
    current_qty: str = "0.0000"
    current_wac: str = "0.0000"
    total_value: str = "0.0000"

# --- Journal Schemas ---
class JournalLineBase(BaseModel):
    account_id: str
    debit: str = "0.0000"
    credit: str = "0.0000"
    description: Optional[str] = None

class JournalLineCreate(JournalLineBase):
    pass

class JournalEntryBase(BaseModel):
    number: str
    date: Optional[datetime] = None
    description: Optional[str] = None

class JournalEntryCreate(JournalEntryBase):
    lines: List[JournalLineCreate]

# --- Inventory Transaction Schemas ---
class GRNLine(BaseModel):
    item_id: str
    warehouse_id: str
    quantity: str
    unit_cost: str

class GRNCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    lines: List[GRNLine]
    supplier_account_id: str

# --- Sales Transaction Schemas ---
class DeliveryNoteLine(BaseModel):
    item_id: str
    warehouse_id: str
    quantity: str

class DeliveryNoteCreate(BaseModel):
    number: str
    date: Optional[datetime] = None
    lines: List[DeliveryNoteLine]
    customer_account_id: str
# --- User/Employee Schemas ---
class EmployeeCreate(BaseModel):
    email: str
    password: str
    role: str
    allowed_tabs: Optional[List[str]] = None
