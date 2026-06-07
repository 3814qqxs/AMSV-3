"""Fix book name normalisation: Psalm→Psalms

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-06

The original import script stored Psalms rows as book='Psalm' (singular).
The frontend and API use the canonical name 'Psalms'. This migration
renames the stored rows so they can be fetched correctly.

Song of Solomon was never imported (multi-word name was skipped by the old
regex). After applying this migration run:

    python scripts/import_bible_text.py data/asv_og.txt --clean

with Docker running to perform a full clean re-import.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE bible_text SET book = 'Psalms' WHERE book = 'Psalm'")


def downgrade() -> None:
    op.execute("UPDATE bible_text SET book = 'Psalm' WHERE book = 'Psalms'")
