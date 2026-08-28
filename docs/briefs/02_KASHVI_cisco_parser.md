# KASHVI — Cisco IOS parser

**Your one line:** turn a Cisco config into the shared format. Your target is
already written down, which is the best position on the team — you never have to
guess whether you're done.

## Files in this folder → where they go

| File | Repo path |
|---|---|
| `cisco_ios.py` | `engine/parsers/cisco_ios.py` |
| `test_cisco_parser.py` | `tests/test_cisco_parser.py` |
| `sample_cisco_ios.cfg` | `samples/` (Manas also pushes it) |
| `normalized_examples.json` | `samples/` (Manas also pushes it) |

## Tonight (30 minutes)

```bash
pip install ciscoconfparse2 pytest
pytest tests/test_cisco_parser.py -v
```

It fails. That's correct. There's one test per resource so you can see exactly
what's left. `cisco_ios.py` has `_vty_lines()` **already written as a worked
example** — read it, then copy that shape for everything else.

Poke at the library first:
```bash
python -c "from ciscoconfparse2 import CiscoConfParse; p=CiscoConfParse('samples/sample_cisco_ios.cfg', syntax='ios'); [print(o.linenum+1, o.text) for o in p.find_objects(r'^line vty')]"
```

## Task order

- **Sat 29:** `vty_line` (done for you), `snmp_community`, `snmp_settings`.
  Attach `raw_ref` line numbers to every resource.
- **Sun 30 — the hard day:** `global_settings`, `local_user`, `enable_secret`,
  `console_line`, `logging`, `ntp`, `ssh_settings`. **Golden test green by
  tonight.**
- **Mon 31:** run over Deep's whole corpus, fix every crash. Different IOS
  versions indent differently and banner blocks span lines.
- **Tue 1:** `_unparsed` — every line you didn't recognise goes in the list with
  its number. Cheap, and it's the hook the training loop plugs into after the 7th.
- **Wed 2:** hardening. Empty file, truncated config, Windows line endings, a
  Juniper config fed in by mistake. Return empty-but-valid, never crash.
- **Fri 4 — stretch, only if everything above is done:** a second vendor.
  MikroTik RouterOS or minimal Juniper `set` syntax. Even four checks turns
  "multi-vendor" from a claim into a demo. **Do not start this early.**

## The part that will cost you time

**Absence-based facts.** Cisco's insecure defaults are silent. A config with no
`no ip http server` line has HTTP *enabled* — the vulnerability is the missing
line. You can't attach a line number to something that isn't there, so emit the
resource with `raw_ref: null` and the insecure default value.

Three findings in the sample report work this way: no syslog host, no SSH
version pin, no login banner.

There's a list of assumed defaults in the comments at the bottom of
`cisco_ios.py`. **Keep it current.** Deep needs it to write matching rules, and
a judge will ask.

One convention to follow: an absent *sub-command* inside a block that exists
(missing `access-class` under `line vty 0 4`) anchors to the block header line.
An entirely absent feature is `null`.

## Done when

`pytest tests/test_cisco_parser.py` is fully green, and every file in Deep's
corpus parses without an exception.

## Your judge questions

- What happens with a vendor you've never seen? (`_unparsed` today, the training
  interface next)
- **How do you detect something that isn't in the config?** This is the most
  interesting thing in your component. Judges reward it. Have the answer ready.
