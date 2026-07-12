"""add attached_to_id self-reference on products

Revision ID: c4a7e1f9b3d2
Revises: b2f1a9c4d7e0
Create Date: 2026-07-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a7e1f9b3d2'
down_revision: Union[str, Sequence[str], None] = 'b2f1a9c4d7e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('products', sa.Column('attached_to_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_products_attached_to_id_products',
        'products',
        'products',
        ['attached_to_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_products_attached_to_id_products', 'products', type_='foreignkey')
    op.drop_column('products', 'attached_to_id')
