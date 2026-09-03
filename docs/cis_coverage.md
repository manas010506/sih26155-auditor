# CIS Benchmark Coverage Report

This document tracks the implementation status of CIS Benchmark controls for Cisco IOS and AWS.

## 🟢 Summary
| Platform | Total Controls in Scope | Covered (Live) | Parked (Pending Parser) | Coverage % |
| :--- | :--- | :--- | :--- | :--- |
| Cisco IOS | 52 | 32 | 2 | 65% |
| AWS Foundations | 45 | 26 | 18 | 58% |
| **Total** | **97** | **58** | **20** | **62%** |

---

## 🛡️ Cisco IOS 17 Benchmark
| Section | Controls | Covered | Parked | Status |
| :--- | :--- | :--- | :--- | :--- |
| Management Plane | 24 | 18 | 2 | 🟡 Partial |
| Control Plane | 11 | 6 | 0 | 🟡 Partial |
| Data Plane | 17 | 8 | 0 | 🟡 Partial |

**Parked Controls (Waiting for `aux_line` parser):**
- `CIS-NET-035`: AUX port open to all input.
- `CIS-NET-036`: AUX port default password.

---

## ☁️ AWS Foundations Benchmark
| Section | Controls | Covered | Parked | Status |
| :--- | :--- | :--- | :--- | :--- |
| Identity (IAM) | 22 | 1 | 9 | 🔴 Gap |
| Storage (S3/RDS/EFS) | 12 | 8 | 1 | 🟡 Partial |
| Logging & Monitoring | 11 | 7 | 1 | 🟡 Partial |
| Networking | 10 | 6 | 4 | 🟡 Partial |
| Others | 10 | 4 | 3 | 🟡 Partial |

**Parked Controls (Waiting for Parser Support):**
- **IAM:** `AWS-IAM-001` to `008`, `010` to `013` (waiting on `account`, `iam_user`, `iam_role`, etc).
- **Storage:** `AWS-EFS-001` (waiting on `efs_file_system`).
- **Logging:** `AWS-LOG-003` (waiting on `aws_config`).
- **Networking:** `AWS-NET-001` to `004` (waiting on `vpc`, `subnet`, `vpc_peering`).

---

## 📝 Glossary
- **Covered**: Rule is implemented, validated, and actively firing in the engine.
- **Parked**: Rule is written and correct, but the parser does not yet emit the required resource type.
- **Not Covered**: Control is identified in the benchmark but not yet implemented.
