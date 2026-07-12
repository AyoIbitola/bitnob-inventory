"""add app_settings table (org-wide low stock threshold)

Revision ID: e3f7a9c2b5d1
Revises: d8b6f2a1c9e4
Create Date: 2026-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f7a9c2b5d1'
down_revision: Union[str, Sequence[str], None] = 'd8b6f2a1c9e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


app_settings = sa.table(
    "app_settings",
    sa.column("id", sa.Integer),
    sa.column("low_stock_threshold", sa.Integer),
)


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    # Exactly one row, always. Seeding it here means the app never has to
    # handle a "no settings row yet" case at request time.
    op.bulk_insert(app_settings, [{"id": 1, "low_stock_threshold": 10}])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('app_settings')
