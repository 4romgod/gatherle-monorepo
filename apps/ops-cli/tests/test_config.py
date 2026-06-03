import sys
import types
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

import gatherle.config as config


class ConfigTests(TestCase):
    def setUp(self) -> None:
        config._env_loaded = False

    def tearDown(self) -> None:
        config._env_loaded = False

    def test_load_env_prefers_ops_cli_dotenv_and_overrides_inherited_values(
        self,
    ) -> None:
        load_dotenv = Mock()
        fake_dotenv = types.SimpleNamespace(load_dotenv=load_dotenv)
        ops_cli_env = Path(config.__file__).resolve().parent.parent / ".env.local"

        def fake_exists(path: Path) -> bool:
            return path == ops_cli_env

        with patch.dict(sys.modules, {"dotenv": fake_dotenv}):
            with patch.object(type(ops_cli_env), "exists", fake_exists):
                config.load_env()

        load_dotenv.assert_called_once_with(dotenv_path=ops_cli_env, override=True)

    def test_load_env_is_idempotent(self) -> None:
        load_dotenv = Mock()
        fake_dotenv = types.SimpleNamespace(load_dotenv=load_dotenv)

        with patch.dict(sys.modules, {"dotenv": fake_dotenv}):
            with patch.object(Path, "exists", return_value=False):
                config.load_env()
                config.load_env()

        load_dotenv.assert_not_called()
