"""Cisco IOS parser.
Repo path: engine/parsers/cisco_ios.py     Owner: Kashvi

Your target is samples/normalized_examples.json -> "cisco_example".
Make test_cisco_parser.py pass. That is the whole job.
"""
from ciscoconfparse2 import CiscoConfParse

from .base import Parser   # while working standalone: from base import Parser


class CiscoIOSParser(Parser):
    source_type = "cisco_ios"

    def parse(self, config_text: str, filename: str) -> dict:
        doc = self.empty(self.source_type, filename)
        try:
            cfg = CiscoConfParse(config_text.splitlines(), syntax="ios")
        except Exception:
            doc["_unparsed"] = [{"line": 0, "text": "config could not be parsed"}]
            return doc

        doc["resources"].extend(self._vty_lines(cfg))       # DAY 1 - do this first
        # doc["resources"].extend(self._snmp_communities(cfg))  # DAY 1
        # doc["resources"].extend(self._snmp_settings(cfg))   # DAY 1
        # doc["resources"].append(self._global_settings(cfg)) # DAY 2
        # doc["resources"].extend(self._local_users(cfg))     # DAY 2
        # doc["resources"].append(self._enable_secret(cfg))   # DAY 2
        # doc["resources"].append(self._console_line(cfg))    # DAY 2
        # doc["resources"].append(self._ssh_settings(cfg))    # DAY 2  (absence)
        # doc["resources"].append(self._logging(cfg))         # DAY 2  (absence)
        # doc["resources"].append(self._ntp(cfg))             # DAY 2
        return doc

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _ref(obj):
        """raw_ref from a ciscoconfparse object. linenum is 0-based -> +1."""
        return {"line": obj.linenum + 1, "snippet": obj.text.strip()}

    # ------------------------------------------------------------ WORKED EXAMPLE
    def _vty_lines(self, cfg):
        """This one is done for you. Copy the shape for everything else.

        Note how attribute_refs is built: whenever a child line is matched, its
        line number is recorded against the attribute that line sets. The rule
        engine uses schema.resolve_ref() to pick the per-attribute line when one
        exists, so a finding about transport_input points at the transport line
        rather than at the block header.

        access_class is deliberately NOT in the map when the sub-command is
        absent. It falls through to the block's own raw_ref, which is the right
        answer: the block exists, only the setting is missing.
        """
        out = []
        for block in cfg.find_objects(r"^line vty"):
            rng = block.text.strip().replace("line vty ", "")
            transport, timeout, access_class, login = [], None, None, "none"
            refs = {}

            for child in block.children:
                t = child.text.strip()
                if t.startswith("transport input"):
                    transport = t.replace("transport input", "").split()
                    refs["transport_input"] = self._ref(child)
                elif t.startswith("exec-timeout"):
                    parts = t.split()
                    timeout = int(parts[1]) if len(parts) > 1 else None
                    refs["exec_timeout_minutes"] = self._ref(child)
                elif t.startswith("access-class"):
                    access_class = t.split()[1]
                    refs["access_class"] = self._ref(child)
                elif t.startswith("login authentication"):
                    login = "aaa"
                elif t == "login":
                    login = "password"

            out.append({
                "id": f"vty-{rng.replace(' ', '-')}",
                "type": "vty_line",
                "attributes": {
                    "range": rng,
                    "transport_input": transport,
                    "exec_timeout_minutes": timeout,
                    "access_class": access_class,
                    "login_method": login,
                    "privilege_level": None,
                },
                "attribute_refs": refs,
                "raw_ref": self._ref(block),
            })
        return out

    # ----------------------------------------------------------------- TODO
    def _snmp_communities(self, cfg):
        """snmp-server community <string> <RO|RW> [acl]
        is_default_string is True for: public, private, cisco, admin, secret.
        """
        raise NotImplementedError

    # ------------------------------------------------------ ABSENCE-BASED FACTS
    # Cisco's insecure defaults are SILENT. A config with no `no ip http server`
    # line has HTTP *enabled* - the vulnerability is the missing line.
    # For those: emit the resource with raw_ref=None and the insecure default.
    #
    # Defaults this parser assumes when the line is absent
    # (keep this list current - Deep needs it, and a judge will ask):
    #   ip http server        absent -> True   (enabled by default on many trains)
    #   cdp run               absent -> True
    #   service password-encryption absent -> False
    #   aaa new-model         absent -> False
    #   ip ssh version        absent -> None   (may negotiate v1)
    #   logging host          absent -> []
    #   banner login          absent -> None
    #   ntp authenticate      absent -> False
