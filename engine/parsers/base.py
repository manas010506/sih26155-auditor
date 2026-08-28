"""Parser interface. Every parser implements this and nothing else.
Repo path: engine/parsers/base.py   Owner: Manas
"""
from abc import ABC, abstractmethod


class Parser(ABC):
    """Turn raw vendor config text into the normalized schema."""

    source_type: str  # "cisco_ios" | "terraform_aws"

    @abstractmethod
    def parse(self, config_text: str, filename: str) -> dict:
        """Return a normalized-schema dict (Handbook 4.1).

        Contract:
          - Never raise on malformed input. Return a valid-but-empty document
            with the offending lines in `_unparsed`.
          - Every resource carries `raw_ref` with a 1-based line number, OR
            `raw_ref: null` when the fact comes from something being absent.
          - Lines the parser does not recognise go into the top-level
            `_unparsed` list. Do not silently drop them.
        """

    @staticmethod
    def empty(source_type: str, filename: str) -> dict:
        return {
            "source": {"type": source_type, "filename": filename},
            "resources": [],
            "_unparsed": [],
        }
