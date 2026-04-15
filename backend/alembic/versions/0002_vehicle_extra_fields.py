"""Vehicle extra fields: key_number, maintenance materials, tires, inspection, registration doc

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("vehicles") as batch_op:
        batch_op.add_column(sa.Column("key_number", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("fuel_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("engine_oil_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("engine_oil_capacity", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("gearbox_oil_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("gearbox_oil_capacity", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("coolant_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("coolant_capacity", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("brake_fluid_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("tire_size_summer", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("tire_size_winter", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("next_inspection_date", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("registration_doc_path", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("vehicles") as batch_op:
        batch_op.drop_column("key_number")
        batch_op.drop_column("fuel_type")
        batch_op.drop_column("engine_oil_type")
        batch_op.drop_column("engine_oil_capacity")
        batch_op.drop_column("gearbox_oil_type")
        batch_op.drop_column("gearbox_oil_capacity")
        batch_op.drop_column("coolant_type")
        batch_op.drop_column("coolant_capacity")
        batch_op.drop_column("brake_fluid_type")
        batch_op.drop_column("tire_size_summer")
        batch_op.drop_column("tire_size_winter")
        batch_op.drop_column("next_inspection_date")
        batch_op.drop_column("registration_doc_path")
