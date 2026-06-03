from subprocess import CompletedProcess
from unittest import TestCase
from unittest.mock import patch

import click

from gatherle.runtime import (
    API_WORKSPACE_NAME,
    REPO_ROOT,
    build_api_npm_command,
    run_api_script,
)


class RuntimeTests(TestCase):
    def test_build_api_npm_command_without_args(self) -> None:
        self.assertEqual(
            build_api_npm_command("seed:catalog"),
            ["npm", "run", "seed:catalog", "-w", API_WORKSPACE_NAME],
        )

    def test_build_api_npm_command_with_args(self) -> None:
        self.assertEqual(
            build_api_npm_command(
                "seed:public-events", script_args=["--data-dir=/tmp/seed"]
            ),
            [
                "npm",
                "run",
                "seed:public-events",
                "-w",
                API_WORKSPACE_NAME,
                "--",
                "--data-dir=/tmp/seed",
            ],
        )

    def test_run_api_script_uses_repo_root_and_env_overrides(self) -> None:
        with patch("gatherle.runtime.load_env") as load_env:
            with patch(
                "gatherle.runtime.ensure_command_available"
            ) as ensure_command_available:
                with patch(
                    "gatherle.runtime.subprocess.run",
                    return_value=CompletedProcess(args=[], returncode=0),
                ) as run:
                    run_api_script("seed:catalog", env_overrides={"CUSTOM_FLAG": "1"})

        load_env.assert_called_once_with()
        ensure_command_available.assert_called_once_with("npm")
        _, kwargs = run.call_args
        self.assertEqual(kwargs["cwd"], REPO_ROOT)
        self.assertEqual(kwargs["env"]["CUSTOM_FLAG"], "1")

    def test_run_api_script_loads_ops_cli_env_before_execution(self) -> None:
        with patch("gatherle.runtime.load_env") as load_env:
            with patch("gatherle.runtime.ensure_command_available"):
                with patch(
                    "gatherle.runtime.subprocess.run",
                    return_value=CompletedProcess(args=[], returncode=0),
                ):
                    run_api_script("seed:catalog")

        load_env.assert_called_once_with()

    def test_run_api_script_exits_with_command_status(self) -> None:
        with patch("gatherle.runtime.load_env"):
            with patch("gatherle.runtime.ensure_command_available"):
                with patch(
                    "gatherle.runtime.subprocess.run",
                    return_value=CompletedProcess(args=[], returncode=9),
                ):
                    with self.assertRaises(click.exceptions.Exit) as error:
                        run_api_script("seed:catalog")

        self.assertEqual(error.exception.exit_code, 9)
