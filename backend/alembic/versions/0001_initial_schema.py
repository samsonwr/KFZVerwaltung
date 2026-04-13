"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('make', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('vin', sa.String(), nullable=True),
        sa.Column('license_plate', sa.String(), nullable=True),
        sa.Column('current_km', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('photo_path', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # maintenance_plans table
    op.create_table(
        'maintenance_plans',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('task_name', sa.String(), nullable=False),
        sa.Column('interval_km', sa.Integer(), nullable=True),
        sa.Column('interval_days', sa.Integer(), nullable=True),
        sa.Column('last_done_km', sa.Integer(), nullable=True),
        sa.Column('last_done_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # service_records table
    op.create_table(
        'service_records',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('km_at_service', sa.Integer(), nullable=False),
        sa.Column('tasks', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('parts_used', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('total_cost', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=False, server_default='[]'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # planned_services table
    op.create_table(
        'planned_services',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('maintenance_plan_id', sa.Integer(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('due_km', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['maintenance_plan_id'], ['maintenance_plans.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # push_subscriptions table
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('endpoint', sa.String(), nullable=False, unique=True),
        sa.Column('keys_p256dh', sa.String(), nullable=False),
        sa.Column('keys_auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint'),
    )


def downgrade() -> None:
    op.drop_table('push_subscriptions')
    op.drop_table('planned_services')
    op.drop_table('service_records')
    op.drop_table('maintenance_plans')
    op.drop_table('vehicles')
