"""Adding the product image url column

Revision ID: b2f1a9c4d7e0
Revises: 307bbbd210c4
Create Date: 2026-07-11 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2f1a9c4d7e0'
down_revision: Union[str, Sequence[str], None] = '307bbbd210c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('products', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('products', sa.Column('image_public_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('products', 'image_public_id')
    op.drop_column('products', 'image_url')