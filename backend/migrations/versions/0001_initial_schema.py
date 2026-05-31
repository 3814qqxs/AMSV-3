"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bible_text",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("book", sa.String(length=64), nullable=False),
        sa.Column("chapter", sa.SmallInteger(), nullable=False),
        sa.Column("verse", sa.SmallInteger(), nullable=False),
        sa.Column("translation", sa.Text(), nullable=False),
        sa.Column("literal_rendering", sa.Text(), nullable=True),
        sa.Column("semantic_domains", sa.JSON(), nullable=True),
        sa.Column("readability_grade", sa.SmallInteger(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "original_language",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("verse_id", sa.Integer(), nullable=True),
        sa.Column("lemma", sa.String(length=128), nullable=True),
        sa.Column("morphology", sa.String(length=128), nullable=True),
        sa.Column("gloss", sa.String(length=256), nullable=True),
        sa.Column("strongs", sa.String(length=32), nullable=True),
        sa.Column("syntax_tree", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["verse_id"], ["bible_text.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "translation_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("verse_id", sa.Integer(), nullable=True),
        sa.Column("note_type", sa.String(length=32), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("references", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["verse_id"], ["bible_text.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "commentary",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("verse_id", sa.Integer(), nullable=True),
        sa.Column("level", sa.String(length=32), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["verse_id"], ["bible_text.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "media",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("verse_id", sa.Integer(), nullable=True),
        sa.Column("media_type", sa.String(length=32), nullable=True),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["verse_id"], ["bible_text.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "cross_reference",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_verse_id", sa.Integer(), nullable=False),
        sa.Column("to_verse_id", sa.Integer(), nullable=False),
        sa.Column("ref_type", sa.String(length=32), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["from_verse_id"], ["bible_text.id"]),
        sa.ForeignKeyConstraint(["to_verse_id"], ["bible_text.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("cross_reference")
    op.drop_table("media")
    op.drop_table("commentary")
    op.drop_table("translation_notes")
    op.drop_table("original_language")
    op.drop_table("bible_text")
