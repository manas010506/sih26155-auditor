"""Cisco IOS parser.
Repo path: engine/parsers/cisco_ios.py     Owner: Kashvi

Target: samples/normalized_examples.json -> "cisco_example"
"""

from ciscoconfparse2 import CiscoConfParse

from .base import Parser


class CiscoIOSParser(Parser):
    source_type = "cisco_ios"

    def parse(self, config_text: str, filename: str) -> dict:
        doc = self.empty(self.source_type, filename)
        self._claimed = set()
        try:
            cfg = CiscoConfParse(config_text.splitlines(), syntax="ios")
        except Exception:
            doc["_unparsed"] = self._unparsed_lines(config_text)
            return doc

        doc["resources"].append(self._global_settings(cfg))
        doc["resources"].append(self._enable_secret(cfg))
        doc["resources"].extend(self._local_users(cfg))
        doc["resources"].extend(self._snmp_communities(cfg))
        doc["resources"].append(self._snmp_settings(cfg))
        self._claim_interfaces(cfg)
        # Already implemented
        doc["resources"].extend(self._vty_lines(cfg))

        doc["resources"].append(self._console_line(cfg))
        doc["resources"].append(self._ssh_settings(cfg))
        doc["resources"].append(self._logging(cfg))
        doc["resources"].append(self._ntp(cfg))
        self._claim_handled_commands(cfg)
        doc["_unparsed"] = self._unparsed_lines(config_text)
        return doc

    # ---------------------------------------------------------------- helpers

    @staticmethod
    def _ref(obj):
        """Return a 1-based line reference from a CiscoConfParse object."""
        return {
            "line": obj.linenum + 1,
            "snippet": obj.text.strip(),
        }

    def _claim(self, obj):
        """Mark a CiscoConfParse object as consumed by the parser."""
        self._claimed.add(obj.linenum)

    def _claim_all(self, cfg, pattern):
        """Mark all matching CiscoConfParse objects as consumed."""
        for obj in cfg.find_objects(pattern):
            self._claim(obj)

    def _find_line(self, cfg, pattern):
        """Return the first matching object, or None."""
        matches = cfg.find_objects(pattern)
        if matches:
            self._claim(matches[0])
            return matches[0]
        return None

    def _claim_handled_commands(self, cfg):
        """Claim known Cisco IOS commands handled by the parser."""

        patterns = [
            # Global commands
            r"^service timestamps ",
            r"^boot-start-marker$",
            r"^boot-end-marker$",
            r"^clock timezone ",
            r"^ip cef$",
            r"^no ip domain-lookup$",
            r"^ip domain-name ",
            r"^ip forward-protocol ",
            r"^ip route ",
            r"^access-list ",

            # SNMP metadata
            r"^snmp-server location ",
            r"^snmp-server contact ",

            # Line blocks
            r"^line aux ",

            # Interface configuration
            r"^interface ",
            r"^description ",
            r"^ip address ",
            r"^duplex ",
            r"^speed ",
            r"^no ip address$",
            r"^shutdown$",

            # End of configuration
            r"^end$",
        ]

        for pattern in patterns:
            self._claim_all(cfg, pattern)

        # Claim children inside auxiliary line blocks.
        for block in cfg.find_objects(r"^line aux "):
            self._claim(block)
            for child in block.children:
                self._claim(child)

        # Claim all children inside VTY blocks.
        for block in cfg.find_objects(r"^line vty "):
            self._claim(block)
            for child in block.children:
                self._claim(child)

    def _unparsed_lines(self, config_text: str):
        """Return config lines that were not consumed by the parser."""
        unparsed = []

        for linenum, line in enumerate(config_text.splitlines()):
            text = line.strip()

            if not text or text.startswith("!"):
                continue

            if linenum not in self._claimed:
                unparsed.append({
                    "line": linenum + 1,
                    "text": text,
                })

        return unparsed
    # ------------------------------------------------------------- GLOBAL

    def _global_settings(self, cfg):
        """Build the normalized global_settings resource."""

        hostname = self._find_line(cfg, r"^hostname ")
        version = self._find_line(cfg, r"^version ")

        password_enc = self._find_line(
            cfg, r"^(?:no )?service password-encryption$"
        )
        aaa = self._find_line(
            cfg, r"^(?:no )?aaa new-model$"
        )
        http = self._find_line(
            cfg, r"^(?:no )?ip http server$"
        )
        https = self._find_line(
            cfg, r"^(?:no )?ip http secure-server$"
        )
        cdp = self._find_line(
            cfg, r"^(?:no )?cdp run$"
        )

        login_banner = self._find_line(cfg, r"^banner login")
        motd_banner = self._find_line(cfg, r"^banner motd")

        source_routing = self._find_line(
            cfg, r"^(?:no )?ip source-route$"
        )

        aaa_auth_login = self._find_line(
            cfg, r"^aaa authentication login "
        )

        aaa_auth_enable = self._find_line(
            cfg, r"^aaa authentication enable "
        )

        aaa_accounting_commands = self._find_line(
            cfg, r"^aaa accounting commands "
        )

        aaa_accounting_connection = self._find_line(
            cfg, r"^aaa accounting connection "
        )

        aaa_accounting_exec = self._find_line(
            cfg, r"^aaa accounting exec "
        )

        aaa_accounting_network = self._find_line(
            cfg, r"^aaa accounting network "
        )

        aaa_accounting_system = self._find_line(
            cfg, r"^aaa accounting system "
        )

        # Defaults are intentionally absence-based.
        password_encryption = False
        aaa_new_model = False
        http_server = True
        https_server = False
        cdp_enabled = True
        source_routing_enabled = True
        aaa_auth_login_value = False
        aaa_auth_enable_value = False
        aaa_accounting_commands_value = False
        aaa_accounting_connection_value = False
        aaa_accounting_exec_value = False
        aaa_accounting_network_value = False
        aaa_accounting_system_value = False

        refs = {}

        if hostname:
            refs["hostname"] = self._ref(hostname)

        if password_enc:
            password_encryption = password_enc.text.strip() == "service password-encryption"
            refs["password_encryption"] = self._ref(password_enc)

        if aaa:
            aaa_new_model = aaa.text.strip() == "aaa new-model"
            refs["aaa_new_model"] = self._ref(aaa)

        if http:
            http_server = http.text.strip() == "ip http server"
            refs["http_server"] = self._ref(http)

        if https:
            https_server = https.text.strip() == "ip http secure-server"
            refs["https_server"] = self._ref(https)

        if cdp:
            cdp_enabled = cdp.text.strip() == "cdp run"
            refs["cdp_enabled"] = self._ref(cdp)

        if source_routing:
            source_routing_enabled = (
                source_routing.text.strip() == "ip source-route"
            )
            refs["source_routing"] = self._ref(source_routing)

        if aaa_auth_login:
            aaa_auth_login_value = aaa_auth_login.text.strip().split(None, 3)[-1]
            refs["aaa_auth_login"] = self._ref(aaa_auth_login)

        if aaa_auth_enable:
            aaa_auth_enable_value = aaa_auth_enable.text.strip().split(None, 3)[-1]
            refs["aaa_auth_enable"] = self._ref(aaa_auth_enable)

        if aaa_accounting_commands:
            aaa_accounting_commands_value = aaa_accounting_commands.text.strip().split(None, 3)[-1]
            refs["aaa_accounting_commands"] = self._ref(aaa_accounting_commands)

        if aaa_accounting_connection:
            aaa_accounting_connection_value = aaa_accounting_connection.text.strip().split(None, 3)[-1]
            refs["aaa_accounting_connection"] = self._ref(aaa_accounting_connection)

        if aaa_accounting_exec:
            aaa_accounting_exec_value = aaa_accounting_exec.text.strip().split(None, 3)[-1]
            refs["aaa_accounting_exec"] = self._ref(aaa_accounting_exec)

        if aaa_accounting_network:
            aaa_accounting_network_value = aaa_accounting_network.text.strip().split(None, 3)[-1]
            refs["aaa_accounting_network"] = self._ref(aaa_accounting_network)

        if aaa_accounting_system:
            aaa_accounting_system_value = aaa_accounting_system.text.strip().split(None, 3)[-1]
            refs["aaa_accounting_system"] = self._ref(aaa_accounting_system)

        return {
            "id": "global",
            "type": "global_settings",
            "attributes": {
                "hostname": (
                    hostname.text.strip().split(None, 1)[1]
                    if hostname else None
                ),
                "os_version": (
                    version.text.strip().split(None, 1)[1]
                    if version else None
                ),
                "password_encryption": password_encryption,
                "aaa_new_model": aaa_new_model,
                "http_server": http_server,
                "https_server": https_server,
                "cdp_enabled": cdp_enabled,
                "enable_secret_present": bool(
                    self._find_line(cfg, r"^enable secret ")
                ),
                "enable_password_present": bool(
                    self._find_line(cfg, r"^enable password ")
                ),
                "enable_password_type": self._enable_password_type(cfg),
                "login_banner": None if login_banner is None else login_banner.text.strip(),
                "motd_banner": None if motd_banner is None else motd_banner.text.strip(),
                "source_routing": source_routing_enabled,
                "aaa_auth_login": aaa_auth_login_value,
                "aaa_auth_enable": aaa_auth_enable_value,
                "aaa_accounting_commands": aaa_accounting_commands_value,
                "aaa_accounting_connection": aaa_accounting_connection_value,
                "aaa_accounting_exec": aaa_accounting_exec_value,
                "aaa_accounting_network": aaa_accounting_network_value,
                "aaa_accounting_system": aaa_accounting_system_value,
            },
            "attribute_refs": refs,
            "raw_ref": None,
        }

    # ---------------------------------------------------------- ENABLE PASSWORD

    def _enable_password_type(self, cfg):
        obj = self._find_line(cfg, r"^enable password ")
        if not obj:
            return 0

        parts = obj.text.strip().split()

        # enable password [0|7] password
        if len(parts) >= 4 and parts[2].isdigit():
            return int(parts[2])

        return 0

    def _enable_secret(self, cfg):


        obj = self._find_line(cfg, r"^enable password ")

        if obj:
            parts = obj.text.strip().split()

            encryption_type = 0
            if len(parts) >= 4 and parts[2].isdigit():
                encryption_type = int(parts[2])

            return {
                "id": "enable-password",
                "type": "enable_secret",
                "attributes": {
                    "uses_secret": False,
                    "encryption_type": encryption_type,
                    "encrypted": False,
                },
                "attribute_refs": {
                    "uses_secret": self._ref(obj),
                },
                "raw_ref": self._ref(obj),
            }

        secret = self._find_line(cfg, r"^enable secret ")

        if secret:
            return {
                "id": "enable-password",
                "type": "enable_secret",
                "attributes": {
                    "uses_secret": True,
                    "encryption_type": 5,
                    "encrypted": True,
                },
                "attribute_refs": {
                    "uses_secret": self._ref(secret),
                },
                "raw_ref": self._ref(secret),
            }

        return {
            "id": "enable-password",
            "type": "enable_secret",
            "attributes": {
                "uses_secret": False,
                "encryption_type": 0,
                "encrypted": False,
            },
            "attribute_refs": {},
            "raw_ref": None,
        }

    # --------------------------------------------------------------- USERS

    def _local_users(self, cfg):
        out = []

        for obj in cfg.find_objects(r"^username "):
            self._claim(obj)
            parts = obj.text.strip().split()

            if len(parts) < 2:
                continue

            name = parts[1]
            privilege = 1
            encryption_type = 0
            encrypted = False

            if "privilege" in parts:
                i = parts.index("privilege")
                if i + 1 < len(parts):
                    try:
                        privilege = int(parts[i + 1])
                    except ValueError:
                        pass

            if "secret" in parts:
                i = parts.index("secret")
                encrypted = True
                if i + 1 < len(parts) and parts[i + 1].isdigit():
                    encryption_type = int(parts[i + 1])

            elif "password" in parts:
                i = parts.index("password")

                if i + 1 < len(parts) and parts[i + 1].isdigit():
                    encryption_type = int(parts[i + 1])

                encrypted = encryption_type != 0

            out.append({
                "id": f"user-{name}",
                "type": "local_user",
                "attributes": {
                    "name": name,
                    "privilege": privilege,
                    "encryption_type": encryption_type,
                    "encrypted": encrypted,
                },
                "attribute_refs": {
                    "encrypted": self._ref(obj),
                },
                "raw_ref": self._ref(obj),
            })

        return out

    # --------------------------------------------------------------- SNMP

    def _snmp_communities(self, cfg):
        out = []

        for obj in cfg.find_objects(r"^snmp-server community "):
            self._claim(obj)
            parts = obj.text.strip().split()

            # snmp-server community STRING ACCESS [ACL]
            if len(parts) < 4:
                continue

            community = parts[2]
            access = parts[3]
            acl = parts[4] if len(parts) > 4 else None

            is_default = community.lower() in {
                "public",
                "private",
                "cisco",
                "admin",
                "secret",
            }

            refs = (
                {"access": self._ref(obj)}
                if access.upper() == "RW"
                else {"is_default_string": self._ref(obj)}
            )

            out.append({
                "id": f"snmp-{community}",
                "type": "snmp_community",
                "attributes": {
                    "community": community,
                    "access": access,
                    "acl": acl,
                    "is_default_string": is_default,
                },
                "attribute_refs": refs,
                "raw_ref": self._ref(obj),
            })

        return out

    def _snmp_settings(self, cfg):
        versions = []

        communities = cfg.find_objects(r"^snmp-server community ")
        if communities:
            versions = ["v1", "v2c"]

        v3_group = cfg.find_objects(r"^snmp-server group .* v3")
        v3_user = cfg.find_objects(r"^snmp-server user .* v3")

        for obj in v3_group:
            self._claim(obj)

        for obj in v3_user:
            self._claim(obj)

        v3 = bool(v3_group or v3_user)

        if v3:
            versions.append("v3")

        trap_objects = cfg.find_objects(r"^snmp-server enable traps")

        for obj in trap_objects:
            self._claim(obj)

        traps = bool(trap_objects)

        return {
            "id": "snmp",
            "type": "snmp_settings",
            "attributes": {
                "v3_configured": v3,
                "versions_in_use": versions,
                "traps_enabled": traps,
            },
            "raw_ref": None,
        }

    # --------------------------------------------------------------- VTY

    def _vty_lines(self, cfg):
        out = []

        for block in cfg.find_objects(r"^line vty"):
            rng = block.text.strip().replace("line vty ", "")
            transport = []
            timeout = None
            access_class = None
            login = "none"
            refs = {}

            for child in block.children:
                t = child.text.strip()

                if t.startswith("transport input"):
                    self._claim(block)
                    transport = t.replace("transport input", "").split()
                    refs["transport_input"] = self._ref(child)

                elif t.startswith("exec-timeout"):
                    self._claim(block)
                    parts = t.split()

                    if len(parts) > 1:
                        try:
                            timeout = int(parts[1])
                        except ValueError:
                            timeout = None

                    refs["exec_timeout_minutes"] = self._ref(child)

                elif t.startswith("access-class"):
                    self._claim(block)
                    parts = t.split()
                    if len(parts) > 1:
                        access_class = parts[1]
                    refs["access_class"] = self._ref(child)

                elif t.startswith("login authentication"):
                    self._claim(block)
                    login = "aaa"

                elif t == "login":
                    self._claim(block)
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

    # -------------------------------------------------------------- CONSOLE
            # ------------------------------------------------------------ INTERFACES

    def _claim_interfaces(self, cfg):
        """Claim interface blocks so their lines are not reported as unparsed."""
        for block in cfg.find_objects(r"^interface "):
            self._claim(block)

            for child in block.children:
                self._claim(child)

    def _console_line(self, cfg):
        block = cfg.find_objects(r"^line con 0")

        if not block:
            return {
                "id": "con-0",
                "type": "console_line",
                "attributes": {
                    "exec_timeout_minutes": None,
                    "login_method": "none",
                    "privilege_level": None,
                },
                "attribute_refs": {},
                "raw_ref": None,
            }

        block = block[0]
        self._claim(block)

        timeout = None
        privilege = None
        login = "none"
        refs = {}

        for child in block.children:
            t = child.text.strip()

            if t.startswith("exec-timeout"):
                self._claim(child)
                parts = t.split()
                if len(parts) > 1:
                    try:
                        timeout = int(parts[1])
                    except ValueError:
                        pass
                refs["exec_timeout_minutes"] = self._ref(child)

            elif t.startswith("privilege level"):
                self._claim(child)
                parts = t.split()
                if len(parts) > 2:
                    try:
                        privilege = int(parts[2])
                    except ValueError:
                        pass
                refs["privilege_level"] = self._ref(child)

            elif t == "no login":
                self._claim(child)
                login = "none"
                refs["login_method"] = self._ref(child)

            elif t == "login":
                self._claim(child)
                login = "password"
                refs["login_method"] = self._ref(child)

        return {
            "id": "con-0",
            "type": "console_line",
            "attributes": {
                "exec_timeout_minutes": timeout,
                "login_method": login,
                "privilege_level": privilege,
            },
            "attribute_refs": refs,
            "raw_ref": self._ref(block),
        }

    # --------------------------------------------------------------- SSH

    def _ssh_settings(self, cfg):
        version = self._find_line(cfg, r"^ip ssh version ")
        timeout = self._find_line(cfg, r"^ip ssh time-out ")
        retries = self._find_line(cfg, r"^ip ssh authentication-retries ")
        key = self._find_line(cfg, r"^crypto key generate rsa")

        return {
            "id": "ssh",
            "type": "ssh_settings",
            "attributes": {
                "version": (
                    int(version.text.strip().split()[-1])
                    if version else None
                ),
                "timeout_seconds": (
                    int(timeout.text.strip().split()[-1])
                    if timeout else None
                ),
                "auth_retries": (
                    int(retries.text.strip().split()[-1])
                    if retries else None
                ),
                "key_bits": None,
            },
            "raw_ref": None,
        }

    # ------------------------------------------------------------ LOGGING

    def _logging(self, cfg):
        hosts = []

        for obj in cfg.find_objects(r"^logging host "):
            self._claim(obj)
            parts = obj.text.strip().split()
            if len(parts) >= 3:
                hosts.append(parts[2])

        buffered = bool(self._find_line(cfg, r"^logging buffered "))
        trap = self._find_line(cfg, r"^logging trap ")
        admin = bool(cfg.find_objects(r"^login on-success log"))

        return {
            "id": "logging",
            "type": "logging",
            "attributes": {
                "hosts": hosts,
                "buffered": buffered,
                "trap_level": (
                    trap.text.strip().split()[-1]
                    if trap else None
                ),
                "logs_admin_access": admin,
            },
            "raw_ref": None,
        }

    # ---------------------------------------------------------------- NTP

    def _ntp(self, cfg):
        servers = []
        refs = {}
        first = None

        for obj in cfg.find_objects(r"^ntp server "):
            self._claim(obj)
            parts = obj.text.strip().split()

            if len(parts) >= 3:
                server = parts[2]
                servers.append(server)

                if first is None:
                    first = obj

                refs.setdefault("servers", self._ref(obj))

        auth = bool(cfg.find_objects(r"^ntp authenticate"))

        return {
            "id": "ntp",
            "type": "ntp",
            "attributes": {
                "servers": servers,
                "authenticated": auth,
            },
            "attribute_refs": refs,
            "raw_ref": self._ref(first) if first else None,
        }
