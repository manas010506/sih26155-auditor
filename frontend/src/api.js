// Repo path: frontend/src/api.js     Owner: Sanavi (Vedant consumes it)

const BASE = "http://localhost:5000";

import sampleReport from "./sample_report.json";

export function sourceTypeFor(filename) {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "tf") return "terraform_aws";

  if (["cfg", "conf", "txt"].includes(ext)) {
    return "cisco_ios";
  }

  return null; // UI must show the manual dropdown
}

export async function audit(configText, sourceType) {
  try {
    const res = await fetch(`${BASE}/api/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_text: configText,
        source_type: sourceType,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `audit failed (${res.status})`
      );
    }

    return await res.json();
  } catch (error) {
    console.warn(
      "Audit API unavailable. Using local sample report.",
      error
    );

    return sampleReport;
  }
}

export async function health() {
  try {
    const r = await fetch(`${BASE}/api/health`);
    return r.ok;
  } catch {
    return false;
  }
}
