"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type CandidateRow = {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  resumeLink?: string;
};

type UploadResult = {
  created: number;
  total: number;
  skipped: number;
};

export default function UploadCsvModal({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const router = useRouter();

  function handleClose() {
    setError(null);
    setResult(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    // Parse CSV outside startTransition so validation errors display immediately
    let rows: CandidateRow[];
    try {
      rows = await parseCsvFile(file);
    } catch (err: any) {
      setError(err.message ?? "Failed to parse CSV.");
      return;
    }

    // Only the API call goes inside startTransition
    startTransition(async () => {
      try {
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
        router.refresh();
        setResult({ created: data.created, total: data.total, skipped: data.skipped });
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  // After upload, show result screen
  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title="Upload Complete">
        <div className="space-y-4">
          {result.created > 0 ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#BBFED4]/20 border border-[#22C55E]/30">
              <svg className="w-5 h-5 text-[#16A34A] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-[#16A34A]">
                  {result.created} candidate{result.created !== 1 ? "s" : ""} added successfully.
                </p>
                {result.skipped > 0 && (
                  <p className="text-foreground-secondary mt-1">
                    {result.skipped} duplicate{result.skipped !== 1 ? "s" : ""} skipped (email or phone already exists in this campaign).
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FFDDA4]/20 border border-[#F59E0B]/30">
              <svg className="w-5 h-5 text-[#D97706] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-[#D97706]">
                  No new candidates were added.
                </p>
                <p className="text-foreground-secondary mt-1">
                  All {result.total} candidate{result.total !== 1 ? "s" : ""} in the CSV already exist in this campaign (matched by email or phone).
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload CSV">
      <div className="text-sm text-foreground-secondary mb-4 space-y-1">
        <p><strong className="text-foreground">Required columns:</strong> name, email</p>
        <p><strong className="text-foreground">Optional columns:</strong> phone, college, department, resume_link</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="csv-file" className="block text-sm font-medium mb-1 text-foreground">CSV file</label>
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv"
            required
            className="w-full border border-border rounded p-2 bg-card text-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm file:font-medium file:hover:bg-primary-hover"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={handleClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
            {isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

async function parseCsvFile(file: File): Promise<CandidateRow[]> {
  // Strip BOM (common in Excel-exported CSVs)
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }
  const rawHeaders = lines[0].split(",").map((h) => h.trim());
  const headersLower = rawHeaders.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const nameIdx = headersLower.indexOf("name");
  const emailIdx = headersLower.indexOf("email");
  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error('CSV must include "name" and "email" columns.');
  }
  const phoneIdx = headersLower.indexOf("phone");
  const collegeIdx = headersLower.indexOf("college");
  const deptIdx = headersLower.indexOf("department");
  const resumeIdx = headersLower.findIndex(
    (h) => h === "resume_link" || h === "resumelink" || /resume/.test(h)
  );
  const rows: CandidateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const name = values[nameIdx]?.trim();
    const email = values[emailIdx]?.trim();
    if (!name || !email) continue;
    rows.push({
      name,
      email,
      phone: phoneIdx >= 0 ? values[phoneIdx]?.trim() || undefined : undefined,
      college: collegeIdx >= 0 ? values[collegeIdx]?.trim() || undefined : undefined,
      department: deptIdx >= 0 ? values[deptIdx]?.trim() || undefined : undefined,
      resumeLink: resumeIdx >= 0 ? values[resumeIdx]?.trim() || undefined : undefined,
    });
  }
  if (rows.length === 0) {
    throw new Error("No valid rows found (need name and email).");
  }
  return rows;
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
