"""Repo path: engine/parsers/terraform_aws.py     Owner: Manas

Turns a Terraform file into the normalized schema.

Two things make this harder than the Cisco parser:

1. python-hcl2 v8 wraps EVERY string in literal quotes, including the resource
   type and name keys. `'"aws_s3_bucket"'`, not `'aws_s3_bucket'`. uq() strips
   them. Miss one and every comparison fails silently.

2. hcl2 gives no line numbers at all, so raw_ref has to come from searching the
   original text. _line_of() does that.

Modern Terraform also splits one logical bucket across four resource types -
aws_s3_bucket, _acl, _server_side_encryption_configuration, _versioning - all
linked by the logical name. _s3_buckets() reconciles them into one resource.
"""
from hcl2.api import load as hcl_load
import io

from engine.parsers.base import Parser

DEFAULT_SG_OPEN_CIDRS = {"0.0.0.0/0", "::/0"}
ADMIN_PORTS = {22, 3389}


def uq(value):
    """Strip the quotes hcl2 leaves on string values and keys."""
    if isinstance(value, str):
        return value.strip('"')
    if isinstance(value, list):
        return [uq(v) for v in value]
    return value


class TerraformAWSParser(Parser):
    source_type = "terraform_aws"

    # ------------------------------------------------------------------ setup
    def parse(self, config_text: str, filename: str) -> dict:
        doc = self.empty(self.source_type, filename)
        self._lines = config_text.splitlines()

        try:
            data = hcl_load(io.StringIO(config_text))
        except Exception:
            doc["_unparsed"] = [{"line": 0, "text": "file is not valid HCL"}]
            return doc

        # flatten: [{'"aws_s3_bucket"': {'"sensitive_data"': {...}}}, ...]
        # into    {'aws_s3_bucket': {'sensitive_data': {...}}}
        blocks: dict[str, dict] = {}
        for entry in data.get("resource", []):
            for rtype, bodies in entry.items():
                for rname, body in bodies.items():
                    blocks.setdefault(uq(rtype), {})[uq(rname)] = body # type: ignore[arg-type]

        doc["resources"].extend(self._s3_buckets(blocks))
        doc["resources"].extend(self._security_group_rules(blocks))
        doc["resources"].extend(self._iam_policies(blocks))
        doc["resources"].extend(self._rds_instances(blocks))
        doc["resources"].extend(self._kms_keys(blocks))
        doc["resources"].extend(self._cloudtrails(blocks))
        return doc

    # ---------------------------------------------------------------- helpers
    def _line_of(self, needle: str, occurrence: int = 1):
        """raw_ref for a line, matched on its stripped text."""
        hits = [i + 1 for i, l in enumerate(self._lines) if l.strip() == needle]
        if len(hits) < occurrence:
            return None
        return {"line": hits[occurrence - 1], "snippet": needle}

    def _find_prefix(self, prefix: str, occurrence: int = 1):
        """raw_ref for the first line starting with `prefix`."""
        hits = [(i + 1, l.strip()) for i, l in enumerate(self._lines)
                if l.strip().startswith(prefix)]
        if len(hits) < occurrence:
            return None
        line, text = hits[occurrence - 1]
        return {"line": line, "snippet": text}

    # -------------------------------------------------------------------- S3
    def _s3_buckets(self, blocks):
        """Reconcile the four aws_s3_bucket_* resource types into one."""
        out = []
        for name, body in blocks.get("aws_s3_bucket", {}).items():
            acl_body = blocks.get("aws_s3_bucket_acl", {}).get(name, {})
            sse_body = blocks.get(
                "aws_s3_bucket_server_side_encryption_configuration", {}).get(name, {})
            ver_body = blocks.get("aws_s3_bucket_versioning", {}).get(name, {})
            log_body = blocks.get("aws_s3_bucket_logging", {}).get(name, {})
            pab_body = blocks.get("aws_s3_bucket_public_access_block", {}).get(name, {})

            acl = uq(acl_body.get("acl")) or uq(body.get("acl"))

            sse_algorithm = None
            for rule in _as_list(sse_body.get("rule")):
                for default in _as_list(rule.get("apply_server_side_encryption_by_default")):
                    sse_algorithm = uq(default.get("sse_algorithm"))

            versioning = False
            for vc in _as_list(ver_body.get("versioning_configuration")):
                versioning = uq(vc.get("status")) == "Enabled"

            refs = {}
            if acl:
                refs["acl"] = self._find_prefix("acl ")
            if sse_algorithm:
                refs["sse_algorithm"] = self._find_prefix("sse_algorithm ")
            bucket_name = uq(body.get("bucket"))
            # Only anchor on the bucket line when there is no acl line - acl is
            # the more specific reference when it exists.
            if bucket_name and not acl:
                ref = self._line_of(f'bucket = "{bucket_name}"')
                if ref:
                    refs["name"] = ref

            out.append({
                "id": f"s3-{name}",
                "type": "s3_bucket",
                "attributes": {
                    "name": bucket_name,
                    "acl": acl,
                    "public_access_block": bool(pab_body),
                    "encrypted": sse_algorithm is not None,
                    "sse_algorithm": sse_algorithm,
                    "versioning": versioning,
                    "access_logging": bool(log_body),
                },
                "attribute_refs": {k: v for k, v in refs.items() if v},
                # No single anchor line: the bucket is assembled from several
                # resources. Absence findings (no encryption, no versioning,
                # no logging) must resolve to null, which they do.
                "raw_ref": None,
            })
        return out

    # -------------------------------------------------------- security groups
    def _security_group_rules(self, blocks):
        """One normalized resource per ingress block."""
        out = []
        for name, body in blocks.get("aws_security_group", {}).items():
            group = uq(body.get("name")) or name   # "web-tier-sg", for display
            for rule in _as_list(body.get("ingress")):
                cidrs = uq(rule.get("cidr_blocks")) or []
                from_port = rule.get("from_port")
                to_port = rule.get("to_port")
                desc = uq(rule.get("description"))

                span = f"{from_port}" if from_port == to_port else f"{from_port}-{to_port}"
                ref = self._line_of(f'description = "{desc}"') if desc else None

                out.append({
                    # id uses the terraform logical name ("web"), not the
                    # name attribute ("web-tier-sg")
                    "id": f"sg-{name}-ingress-{span}",
                    "type": "security_group_rule",
                    "attributes": {
                        "group": group,
                        "direction": "ingress",
                        "protocol": uq(rule.get("protocol")),
                        "from_port": from_port,
                        "to_port": to_port,
                        "cidr_blocks": cidrs,
                        # Normalized facts, computed here rather than left for
                        # the rules to work out from raw ports.
                        "open_to_internet": any(c in DEFAULT_SG_OPEN_CIDRS for c in cidrs),
                        "is_wide_range": (to_port or 0) - (from_port or 0) > 100,
                    },
                    "raw_ref": ref,
                })
        return out

    # ------------------------------------------------------------------- IAM
    def _iam_policies(self, blocks):
        out = []
        for name, body in blocks.get("aws_iam_policy", {}).items():
            policy = body.get("policy") or ""
            wildcard_action = 'Action = "*"' in policy or '"Action": "*"' in policy
            wildcard_resource = 'Resource = "*"' in policy or '"Resource": "*"' in policy
            wildcard_principal = 'Principal = "*"' in policy or '"Principal": "*"' in policy

            refs = {}
            for attr, needle in (("wildcard_action", 'Action   = "*"'),
                                 ("wildcard_resource", 'Resource = "*"')):
                ref = self._line_of(needle)
                if ref:
                    refs[attr] = ref

            out.append({
                "id": f"iam-{name}",
                "type": "iam_policy",
                "attributes": {
                    "name": uq(body.get("name")),
                    "wildcard_action": wildcard_action,
                    "wildcard_resource": wildcard_resource,
                    "wildcard_principal": wildcard_principal,
                    "statement_count": policy.count("Effect"),
                },
                "attribute_refs": refs,
                "raw_ref": refs.get("wildcard_action"),
            })
        return out

    # ------------------------------------------------------------------- RDS
    def _rds_instances(self, blocks):
        out = []
        for name, body in blocks.get("aws_db_instance", {}).items():
            fields = {
                "publicly_accessible": "publicly_accessible",
                "storage_encrypted": "storage_encrypted",
                "backup_retention_days": "backup_retention_period",
                "deletion_protection": "deletion_protection",
                "auto_minor_version_upgrade": "auto_minor_version_upgrade",
            }
            refs = {}
            for attr, tf_key in fields.items():
                ref = self._find_prefix(f"{tf_key} ")
                if ref:
                    refs[attr] = ref

            out.append({
                "id": f"rds-{name}",
                "type": "rds_instance",
                "attributes": {
                    "identifier": uq(body.get("identifier")),
                    "engine": uq(body.get("engine")),
                    "publicly_accessible": body.get("publicly_accessible", False),
                    "storage_encrypted": body.get("storage_encrypted", False),
                    "backup_retention_days": body.get("backup_retention_period", 0),
                    "deletion_protection": body.get("deletion_protection", False),
                    "auto_minor_version_upgrade": body.get("auto_minor_version_upgrade", False),
                },
                "attribute_refs": refs,
                "raw_ref": refs.get("publicly_accessible"),
            })
        return out

    # ------------------------------------------------------------------- KMS
    def _kms_keys(self, blocks):
        out = []
        for name, body in blocks.get("aws_kms_key", {}).items():
            ref = self._find_prefix("enable_key_rotation ")
            out.append({
                "id": f"kms-{name}",
                "type": "kms_key",
                "attributes": {
                    "description": uq(body.get("description")),
                    "key_rotation": body.get("enable_key_rotation", False),
                },
                "attribute_refs": {"key_rotation": ref} if ref else {},
                "raw_ref": ref,
            })
        return out

    # ------------------------------------------------------------ CloudTrail
    def _cloudtrails(self, blocks):
        out = []
        for name, body in blocks.get("aws_cloudtrail", {}).items():
            trail_name = uq(body.get("name"))
            refs = {}
            for attr, needle in (
                ("exists", f'name                          = "{trail_name}"'),
                ("multi_region", "is_multi_region_trail "),
                ("log_file_validation", "enable_log_file_validation "),
            ):
                ref = (self._line_of(needle) if attr == "exists"
                       else self._find_prefix(needle))
                if ref:
                    refs[attr] = ref

            out.append({
                "id": f"cloudtrail-{name}",
                "type": "cloudtrail",
                "attributes": {
                    "name": trail_name,
                    "exists": True,
                    "multi_region": body.get("is_multi_region_trail", False),
                    "log_file_validation": body.get("enable_log_file_validation", False),
                    "global_service_events": body.get("include_global_service_events", False),
                },
                "attribute_refs": refs,
                "raw_ref": refs.get("multi_region"),
            })
        return out


def _as_list(value):
    """hcl2 gives a dict for one block and a list for several."""
    if value is None:
        return []
    return value if isinstance(value, list) else [value]