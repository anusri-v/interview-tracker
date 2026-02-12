"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function CsvUploadForm({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setError("CSV must have a header row and at least one data row.");
      return;
    }
    const rawHeaders = lines[0].split(",").map((h) => h.trim());
    const headersLower = rawHeaders.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const nameIdx = headersLower.indexOf("name");
    const emailIdx = headersLower.indexOf("email");
    if (nameIdx === -1 || emailIdx === -1) {
      setError('CSV must include "name" and "email" columns.');
      return;
    }
    const phoneIdx = headersLower.indexOf("phone");
    const collegeIdx = headersLower.indexOf("college");
    const deptIdx = headersLower.indexOf("department");
    const resumeIdx = headersLower.findIndex((h) => h === "resume_link" || h === "resumelink" || /resume/.test(h));
    const rows: { name: string; email: string; phone?: string; college?: string; department?: string; resumeLink?: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const name = values[nameIdx]?.trim();
      const email = values[emailIdx]?.trim();
      if (!name || !email) continue;
      const phone = phoneIdx >= 0 ? values[phoneIdx]?.trim() || undefined : undefined;
      const college = collegeIdx >= 0 ? values[collegeIdx]?.trim() || undefined : undefined;
      const department = deptIdx >= 0 ? values[deptIdx]?.trim() || undefined : undefined;
      const resumeLink = resumeIdx >= 0 ? values[resumeIdx]?.trim() || undefined : undefined;
      rows.push({ name, email, phone, college, department, resumeLink });
    }
    if (rows.length === 0) {
      setError("No valid rows found (need name and email).");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/candidates/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      router.push(`/admin/campaigns/${campaignId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="file" className="block text-sm font-medium mb-1">CSV file</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv"
          required
          className="w-full border rounded p-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || c === "\n") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}
