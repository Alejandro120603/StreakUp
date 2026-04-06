"""
CLI commands for backend operational tasks.

Responsibility:
- Expose deploy-safe bootstrap commands for hosted environments.
"""

import click

from app.services.catalog_bootstrap_service import seed_catalog


def register_cli_commands(app) -> None:
    """Register custom Flask CLI commands."""

    @app.cli.command("seed-catalog")
    def seed_catalog_command() -> None:
        """Seed the default habit catalog without demo users."""
        summary = seed_catalog()
        click.echo(
            "Catalog ready. "
            f"categories_created={summary['categories_created']} "
            f"habits_created={summary['habits_created']} "
            f"total_categories={summary['total_categories']} "
            f"total_habits={summary['total_habits']}"
        )
