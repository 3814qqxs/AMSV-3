"""enforce not-null on child table foreign keys

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-21
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ["original_language", "translation_notes", "commentary", "media"]


def upgrade() -> None:
    for table in _TABLES:
        op.alter_column(table, "verse_id", nullable=False)


def downgrade() -> None:
    for table in _TABLES:
        op.alter_column(table, "verse_id", nullable=True)
