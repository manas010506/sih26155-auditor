"""Repo path: engine/parsers/juniper_junos.py     Owner: Manas

Juniper JunOS `set`-syntax parser.

The point of this file is what it does NOT contain: no rules, no severities, no
compliance logic. It emits exactly the same normalized resource types as the
Cisco parser, so `engine/rules/cisco_rules.yaml` evaluates a Juniper device
without a single rule changing.

    Cisco IOS ──┐
                ├──> normalized model ──> one ruleset ──> findings
    JunOS ──────┘

JunOS defaults are the inverse of Cisco's in an important way. Cisco enables
things unless told otherwise (`ip http server` is on until you disable it);
JunOS enables a service only when the line is present. So `set system services
telnet` present means Telnet is on, and its absence means off — the opposite
polarity to the Cisco parser, and getting it backwards would invert half the
findings.
"""
from __future__ import annotations

import re

from engine.parsers.base import Parser

DEFAULT_COMMUNITIES = {"public", "private", "cisco", "admin", "secret", "juniper"}


class JuniperJunOSParser(Parser):
    source_type = "juniper_junos"

    # ------------------------------------------------------------------ setup
    def parse(self, config_text: str, filename: str) -> dict:
        doc = self.empty(self.source_type, filename)
        self._lines = config_text.splitlines()
        self._claimed: set[int] = set()

        try:
            doc["resources"].append(self._global_settings())
            doc["resources"].extend(self._vty_lines())
            doc["resources"].append(self._ssh_settings())
            doc["resources"].extend(self._snmp_communities())
            doc["resources"].append(self._snmp_settings())
            doc["resources"].extend(self._local_users())
            doc["resources"].append(self._logging())
            doc["resources"].append(self._ntp())
        except Exception:
            # A parser must never crash the engine. Return what we have.
            return doc

        self._apply_learned(doc)
        doc["_unparsed"] = self._unparsed_lines()
        return doc

    # ---------------------------------------------------------------- helpers
    def _find(self, pattern: str):
        """First line matching `pattern`, marked as consumed."""
        for i, line in enumerate(self._lines):
            if re.search(pattern, line.strip(), re.IGNORECASE):
                self._claimed.add(i)
                return i, line.strip()
        return None, None

    def _find_all(self, pattern: str):
        """Every line matching `pattern`, all marked as consumed."""
        out = []
        for i, line in enumerate(self._lines):
            if re.search(pattern, line.strip(), re.IGNORECASE):
                self._claimed.add(i)
                out.append((i, line.strip()))
        return out

    @staticmethod
    def _ref(index: int, text: str):
        return {"line": index + 1, "snippet": text}

    def _maybe_ref(self, index, text):
        return self._ref(index, text) if index is not None else None

    # -------------------------------------------------------- global settings
    def _global_settings(self) -> dict:
        i_host, t_host = self._find(r"^set system host-name\s+")
        hostname = t_host.split()[-1] if t_host else None

        i_ver, t_ver = self._find(r"^set version\s+")
        version = t_ver.split()[-1] if t_ver else None

        # Services exist only when declared - the inverse of Cisco.
        i_http, t_http = self._find(r"^set system services web-management http\b(?!s)")
        i_https, t_https = self._find(r"^set system services web-management https\b")

        i_auth, t_auth = self._find(r"^set system authentication-order\s+")
        i_tacacs, t_tacacs = self._find(r"^set system (tacplus-server|radius-server)")
        i_acct, t_acct = self._find(r"^set system accounting\b")
        i_root, t_root = self._find(r"^set system root-authentication\b")

        i_banner, t_banner = self._find(r"^set system login (message|announcement)\b")
        i_src, t_src = self._find(r"^set (system )?.*source-route")
        i_lldp, t_lldp = self._find(r"^set protocols lldp\b")

        attrs = {
            "hostname": hostname,
            "os_version": version,
            # JunOS stores passwords hashed by default; there is no equivalent
            # of Cisco's reversible type 7, so this is structurally true.
            "password_encryption": True,
            "aaa_new_model": t_tacacs is not None,
            "aaa_auth_login": t_auth.split(None, 3)[-1] if t_auth else None,   # method list or None
            "aaa_auth_enable": "root-authentication" if t_root else None,
            "aaa_accounting_commands": t_acct.split(None, 2)[-1] if t_acct else None,
            "aaa_accounting_connection": None,
            "aaa_accounting_exec": None,
            "aaa_accounting_network": None,
            "aaa_accounting_system": None,
            "http_server": t_http is not None,
            "https_server": t_https is not None,
            "cdp_enabled": t_lldp is not None,
            "source_routing": t_src is not None,
            "enable_secret_present": t_root is not None,
            "enable_password_present": False,
            "enable_password_type": None,
            "login_banner": t_banner.split(None, 3)[-1].strip('"') if t_banner else None,
            "motd_banner": None,
        }

        refs = {}
        for attr, idx, txt in (
            ("hostname", i_host, t_host),
            ("os_version", i_ver, t_ver),
            ("http_server", i_http, t_http),
            ("https_server", i_https, t_https),
            ("aaa_new_model", i_tacacs, t_tacacs),
            ("aaa_auth_login", i_auth, t_auth),
            ("aaa_accounting_commands", i_acct, t_acct),
            ("cdp_enabled", i_lldp, t_lldp),
            ("source_routing", i_src, t_src),
            ("login_banner", i_banner, t_banner),
            ("aaa_auth_enable", i_root, t_root),
        ):
            r = self._maybe_ref(idx, txt)
            if r:
                refs[attr] = r

        return {
            "id": "global",
            "type": "global_settings",
            "attributes": attrs,
            "attribute_refs": refs,
            "raw_ref": None,
        }

    # -------------------------------------------------------------- vty lines
    def _vty_lines(self) -> list[dict]:
        """JunOS has no `line vty`; remote access is a set of services.

        We express it as one vty_line resource so the existing VTY rules apply.
        """
        i_telnet, t_telnet = self._find(r"^set system services telnet\b")
        i_ssh, t_ssh = self._find(r"^set system services ssh\b")
        i_idle, t_idle = self._find(r"^set system login .*idle-timeout\s+\d+")
        i_acl, t_acl = self._find(r"^set (system services .*connection-limit|firewall .*filter .*ssh)")

        transport = []
        if t_telnet:
            transport.append("telnet")
        if t_ssh:
            transport.append("ssh")

        timeout = None
        if t_idle:
            m = re.search(r"idle-timeout\s+(\d+)", t_idle)
            timeout = int(m.group(1)) if m else None

        refs = {}
        for attr, idx, txt in (("transport_input", i_telnet or i_ssh, t_telnet or t_ssh),
                               ("exec_timeout_minutes", i_idle, t_idle),
                               ("access_class", i_acl, t_acl)):
            r = self._maybe_ref(idx, txt)
            if r:
                refs[attr] = r

        return [{
            "id": "vty-remote-access",
            "type": "vty_line",
            "attributes": {
                "range": "remote-access",
                "transport_input": transport,
                "exec_timeout_minutes": timeout,
                "access_class": t_acl.split()[-1] if t_acl else None,
                "login_method": "aaa" if self._find(r"^set system authentication-order")[1] else "password",
                "privilege_level": None,
            },
            "attribute_refs": refs,
            "raw_ref": self._maybe_ref(i_ssh or i_telnet, t_ssh or t_telnet),
        }]

    # ------------------------------------------------------------ ssh settings
    def _ssh_settings(self) -> dict:
        i_ver, t_ver = self._find(r"^set system services ssh protocol-version\s+")
        i_to, t_to = self._find(r"^set system services ssh .*(connection-limit|client-alive-count-max)\s+\d+")
        i_retry, t_retry = self._find(r"^set system services ssh .*(retry|max-sessions-per-connection)\s+\d+")

        version = None
        if t_ver:
            m = re.search(r"protocol-version\s+v?(\d)", t_ver)
            version = int(m.group(1)) if m else None

        def _num(text, key):
            if not text:
                return None
            m = re.search(rf"{key}\s+(\d+)", text)
            return int(m.group(1)) if m else None

        refs = {}
        for attr, idx, txt in (("version", i_ver, t_ver),
                               ("timeout_seconds", i_to, t_to),
                               ("auth_retries", i_retry, t_retry)):
            r = self._maybe_ref(idx, txt)
            if r:
                refs[attr] = r

        return {
            "id": "ssh",
            "type": "ssh_settings",
            "attributes": {
                "version": version,
                "timeout_seconds": _num(t_to, "connection-limit"),
                "auth_retries": _num(t_retry, "retry"),
                "key_bits": None,
            },
            "attribute_refs": refs,
            "raw_ref": None,
        }

    # ------------------------------------------------------------------- SNMP
    def _snmp_communities(self) -> list[dict]:
        out = []
        for idx, text in self._find_all(r"^set snmp community\s+\S+"):
            m = re.search(r"^set snmp community\s+(\S+)", text)
            if not m:
                continue
            name = m.group(1)
            access = "RW" if re.search(r"read-write", text, re.IGNORECASE) else "RO"
            out.append({
                "id": f"snmp-{name}",
                "type": "snmp_community",
                "attributes": {
                    "community": name,
                    "access": access,
                    "acl": None,
                    "is_default_string": name.lower() in DEFAULT_COMMUNITIES,
                },
                "attribute_refs": {
                    ("access" if access == "RW" else "is_default_string"): self._ref(idx, text)
                },
                "raw_ref": self._ref(idx, text),
            })
        return out

    def _snmp_settings(self) -> dict:
        i_v3, t_v3 = self._find(r"^set snmp v3\b")
        i_trap, t_trap = self._find(r"^set snmp trap-group\b")
        communities = self._find_all(r"^set snmp community\s+")

        versions = []
        if communities:
            versions = ["v1", "v2c"]
        if t_v3:
            versions.append("v3")

        refs = {}
        for attr, idx, txt in (("v3_configured", i_v3, t_v3),
                               ("traps_enabled", i_trap, t_trap)):
            r = self._maybe_ref(idx, txt)
            if r:
                refs[attr] = r

        return {
            "id": "snmp",
            "type": "snmp_settings",
            "attributes": {
                "v3_configured": t_v3 is not None,
                "versions_in_use": versions,
                "traps_enabled": t_trap is not None,
            },
            "attribute_refs": refs,
            "raw_ref": None,
        }

    # ------------------------------------------------------------ local users
    def _local_users(self) -> list[dict]:
        out = []
        seen = set()
        for idx, text in self._find_all(r"^set system login user\s+\S+"):
            m = re.search(r"^set system login user\s+(\S+)", text)
            if not m or m.group(1) in seen:
                continue
            name = m.group(1)
            seen.add(name)

            # plain-text-password means it was entered unhashed.
            plaintext = "plain-text-password" in text.lower()
            # super-user is JunOS's privilege-15 equivalent.
            klass = re.search(r"class\s+(\S+)", text)
            privilege = 15 if klass and klass.group(1) == "super-user" else 1

            out.append({
                "id": f"user-{name}",
                "type": "local_user",
                "attributes": {
                    "name": name,
                    "privilege": privilege,
                    "encryption_type": 0 if plaintext else 9,
                    "encrypted": not plaintext,
                },
                "attribute_refs": {"encrypted": self._ref(idx, text)},
                "raw_ref": self._ref(idx, text),
            })
        return out

    # ---------------------------------------------------------------- logging
    def _logging(self) -> dict:
        hosts = []
        first = None
        for idx, text in self._find_all(r"^set system syslog host\s+\S+"):
            m = re.search(r"^set system syslog host\s+(\S+)", text)
            if m:
                hosts.append(m.group(1))
                first = first or (idx, text)

        i_file, t_file = self._find(r"^set system syslog file\b")
        i_level, t_level = self._find(r"^set system syslog .*(any|authorization)\s+(emergency|alert|critical|error|warning|notice|info|any)")

        refs = {}
        if first:
            refs["hosts"] = self._ref(*first)
        r = self._maybe_ref(i_file, t_file)
        if r:
            refs["buffered"] = r

        return {
            "id": "logging",
            "type": "logging",
            "attributes": {
                "hosts": hosts,
                "buffered": t_file is not None,
                "trap_level": t_level.split()[-1] if t_level else None,
                "logs_admin_access": bool(hosts),
            },
            "attribute_refs": refs,
            "raw_ref": None,
        }

    # -------------------------------------------------------------------- NTP
    def _ntp(self) -> dict:
        servers = []
        first = None
        for idx, text in self._find_all(r"^set system ntp server\s+\S+"):
            m = re.search(r"^set system ntp server\s+(\S+)", text)
            if m:
                servers.append(m.group(1))
                first = first or (idx, text)

        i_key, t_key = self._find(r"^set system ntp (authentication-key|trusted-key)")

        refs = {}
        if first:
            refs["servers"] = self._ref(*first)
        r = self._maybe_ref(i_key, t_key)
        if r:
            refs["authenticated"] = r

        return {
            "id": "ntp",
            "type": "ntp",
            "attributes": {
                "servers": servers,
                "authenticated": t_key is not None,
            },
            "attribute_refs": refs,
            "raw_ref": self._ref(*first) if first else None,
        }

    # ------------------------------------------------------- learned mappings
    def _apply_learned(self, doc: dict) -> None:
        """Apply anything an administrator has taught us, same as Cisco."""
        try:
            from engine.parsers.learned import load_mappings, match_line
        except ImportError:
            return
        mappings = load_mappings()
        if not mappings:
            return
        for i, line in enumerate(self._lines):
            text = line.strip()
            if not text or text.startswith("#") or i in self._claimed:
                continue
            mapping = match_line(text, mappings, self.source_type)
            if mapping is None:
                continue
            for resource in doc["resources"]:
                if resource["type"] == mapping["resource_type"]:
                    resource["attributes"][mapping["attribute"]] = mapping["value"]
                    self._claimed.add(i)
                    break

    # -------------------------------------------------------------- unparsed
    def _unparsed_lines(self) -> list[dict]:
        """Every line no method consumed.

        A line is recognised only if something actually read it. Anything else
        surfaces in the training interface rather than being silently dropped.
        """
        out = []
        for i, line in enumerate(self._lines):
            text = line.strip()
            if not text or text.startswith("#") or i in self._claimed:
                continue
            out.append({"line": i + 1, "text": text})
        return out