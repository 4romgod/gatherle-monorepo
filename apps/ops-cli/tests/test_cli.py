from pathlib import Path
from unittest import TestCase
from unittest.mock import call, patch

from click.testing import CliRunner

from gatherle import cli_entry
from gatherle.scripts.harvest_gauteng_events import (
    PUBLIC_SEED_DATA_DIR_REQUIRED_MESSAGE,
)


class CliCommandTests(TestCase):
    def setUp(self) -> None:
        self.runner = CliRunner()

    def test_seed_catalog_runs_api_catalog_seed(self) -> None:
        with patch("gatherle.commands.seed.run_api_script") as run_api_script:
            result = self.runner.invoke(cli_entry, ["seed", "catalog"])

        self.assertEqual(result.exit_code, 0)
        run_api_script.assert_called_once_with("seed:catalog")

    def test_seed_public_events_passes_data_dir_to_api_script(self) -> None:
        with patch("gatherle.commands.seed.run_api_script") as run_api_script:
            result = self.runner.invoke(
                cli_entry, ["seed", "public-events", "--data-dir", "tmp/seed"]
            )

        self.assertEqual(result.exit_code, 0)
        resolved = Path("tmp/seed").resolve()
        run_api_script.assert_called_once_with(
            "seed:public-events",
            script_args=[f"--data-dir={resolved}"],
            env_overrides={"PUBLIC_SEED_DATA_DIR": str(resolved)},
        )

    def test_seed_public_events_uses_env_public_seed_data_dir_when_present(
        self,
    ) -> None:
        custom_dir = Path("tmp/custom-seed").resolve()
        with patch("gatherle.commands.seed.run_api_script") as run_api_script:
            result = self.runner.invoke(
                cli_entry,
                ["seed", "public-events"],
                env={"PUBLIC_SEED_DATA_DIR": str(custom_dir)},
            )

        self.assertEqual(result.exit_code, 0)
        run_api_script.assert_called_once_with(
            "seed:public-events",
            script_args=[f"--data-dir={custom_dir}"],
            env_overrides={"PUBLIC_SEED_DATA_DIR": str(custom_dir)},
        )

    def test_seed_public_events_requires_data_dir(self) -> None:
        with patch("gatherle.commands.seed.run_api_script") as run_api_script:
            result = self.runner.invoke(cli_entry, ["seed", "public-events"])

        self.assertNotEqual(result.exit_code, 0)
        self.assertIn(PUBLIC_SEED_DATA_DIR_REQUIRED_MESSAGE, result.output)
        run_api_script.assert_not_called()

    def test_seed_launch_like_runs_full_sequence(self) -> None:
        with patch("gatherle.commands.seed.run_api_script") as run_api_script:
            result = self.runner.invoke(
                cli_entry, ["seed", "launch-like", "--data-dir", "tmp/seed"]
            )

        self.assertEqual(result.exit_code, 0)
        resolved = Path("tmp/seed").resolve()
        self.assertEqual(
            run_api_script.call_args_list,
            [
                call("seed:catalog"),
                call("seed:system-users"),
                call(
                    "seed:public-events",
                    script_args=[f"--data-dir={resolved}"],
                    env_overrides={"PUBLIC_SEED_DATA_DIR": str(resolved)},
                ),
                call("geocode-events"),
            ],
        )

    def test_events_maintain_occurrences_maps_options(self) -> None:
        with patch("gatherle.commands.events.run_api_script") as run_api_script:
            result = self.runner.invoke(
                cli_entry,
                [
                    "events",
                    "maintain-occurrences",
                    "--limit",
                    "25",
                    "--after-event-id",
                    "evt_123",
                    "--threshold-days",
                    "21",
                    "--event-series-id",
                    "series_456",
                    "--dry-run",
                ],
            )

        self.assertEqual(result.exit_code, 0)
        run_api_script.assert_called_once_with(
            "maintain-event-occurrences",
            script_args=[
                "--limit",
                "25",
                "--after-event-id",
                "evt_123",
                "--threshold-days",
                "21",
                "--event-series-id",
                "series_456",
                "--dry-run",
            ],
        )

    def test_commons_emit_schema_runs_api_script(self) -> None:
        with patch("gatherle.commands.commons.run_api_script") as run_api_script:
            result = self.runner.invoke(cli_entry, ["commons", "emit-schema"])

        self.assertEqual(result.exit_code, 0)
        run_api_script.assert_called_once_with("emit-schema")

    def test_public_seed_sync_runs_harvest_then_import_sequence(self) -> None:
        harvest_result = {
            "final_events": 12,
            "data_dir": str(Path("tmp/seed").resolve()),
            "window_start": "2026-06-03T00:00:00+02:00",
            "window_end": "2026-12-31T23:59:59.999000+02:00",
        }

        with patch(
            "gatherle.commands.public_seed._run_harvest", return_value=harvest_result
        ) as run_harvest:
            with patch(
                "gatherle.commands.public_seed.run_api_script"
            ) as run_api_script:
                result = self.runner.invoke(
                    cli_entry,
                    [
                        "public-seed",
                        "sync-gauteng-events",
                        "--data-dir",
                        "tmp/seed",
                        "--no-geocode",
                    ],
                )

        self.assertEqual(result.exit_code, 0)
        run_harvest.assert_called_once_with(Path("tmp/seed"), None, None, ())
        resolved = Path(harvest_result["data_dir"]).resolve()
        self.assertEqual(
            run_api_script.call_args_list,
            [
                call("seed:catalog"),
                call("seed:system-users"),
                call(
                    "seed:public-events",
                    script_args=[f"--data-dir={resolved}"],
                    env_overrides={"PUBLIC_SEED_DATA_DIR": str(resolved)},
                ),
            ],
        )

    def test_public_seed_harvest_requires_data_dir(self) -> None:
        result = self.runner.invoke(
            cli_entry, ["public-seed", "harvest-gauteng-events"]
        )
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn(PUBLIC_SEED_DATA_DIR_REQUIRED_MESSAGE, result.output)

    def test_public_seed_harvest_uses_env_public_seed_data_dir_when_present(
        self,
    ) -> None:
        custom_dir = Path("tmp/harvest-seed").resolve()
        harvest_result = {
            "final_events": 12,
            "data_dir": str(custom_dir),
            "window_start": "2026-06-03T00:00:00+02:00",
            "window_end": "2026-12-31T23:59:59.999000+02:00",
        }

        with patch(
            "gatherle.commands.public_seed._run_harvest", return_value=harvest_result
        ) as run_harvest:
            result = self.runner.invoke(
                cli_entry,
                ["public-seed", "harvest-gauteng-events"],
                env={"PUBLIC_SEED_DATA_DIR": str(custom_dir)},
            )

        self.assertEqual(result.exit_code, 0)
        run_harvest.assert_called_once_with(None, None, None, ())
