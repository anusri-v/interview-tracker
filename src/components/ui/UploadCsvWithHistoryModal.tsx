"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type MappingOption =
  | "name"
  | "email"
  | "phone"
  | "current_role"
  | "resume_link"
  | "college"
  | "department"
  | "ignore";

type RoundMapping = { interviewer: number; result: number; feedback: number }; // column indices

type UploadResult = {
  created: number;
  total: number;
  skipped: number;
  interviewsCreated?: number;
  warnings?: string[];
};

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

const STANDARD_FIELDS: { key: MappingOption; patterns: RegExp[] }[] = [
  { key: "name", patterns: [/^name$/i] },
  { key: "email", patterns: [/^email$/i, /^e-?mail$/i] },
  { key: "phone", patterns: [/^phone$/i, /^mobile$/i, /^contact$/i] },
  { key: "current_role", patterns: [/^current.?role$/i, /^role$/i, /^designation$/i] },
  { key: "resume_link", patterns: [/^resume/i, /^cv/i] },
  { key: "college", patterns: [/^college$/i, /^university$/i, /^institute$/i] },
  { key: "department", patterns: [/^department$/i, /^dept$/i, /^branch$/i] },
];

export default function UploadCsvWithHistoryModal({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const router = useRouter();

  // CSV state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<(MappingOption | string)[]>([]);
  const [roundMappings, setRoundMappings] = useState<RoundMapping[]>([]);

  function handleClose() {
    setStep(1);
    setError(null);
    setResult(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setRoundMappings([]);
    onClose();
  }

  // Step 1: File upload
  async function handleFileUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setError("CSV must have a header row and at least one data row.");
        return;
      }
      const rawHeaders = parseCsvLine(lines[0]).map((h) => h.trim());
      const dataRows = lines.slice(1).map((l) => parseCsvLine(l));
      setHeaders(rawHeaders);
      setRows(dataRows);

      // Auto-detect mappings
      const autoMappings: (MappingOption | string)[] = rawHeaders.map((h) => {
        const lower = h.toLowerCase().replace(/\s+/g, "_");
        for (const field of STANDARD_FIELDS) {
          if (field.patterns.some((p) => p.test(lower))) return field.key;
        }
        return "ignore";
      });

      // Auto-detect round mappings
      const detectedRounds: RoundMapping[] = [];
      for (let i = 0; i < rawHeaders.length; i++) {
        const lower = rawHeaders[i].toLowerCase().replace(/\s+/g, "_");
        const matchInterviewer = lower.match(/^r(?:ound)?_?(\d+)_?interviewer$/);
        if (matchInterviewer) {
          const roundNum = parseInt(matchInterviewer[1]);
          // Find corresponding result column
          const resultIdx = rawHeaders.findIndex((rh) => {
            const rl = rh.toLowerCase().replace(/\s+/g, "_");
            return new RegExp(`^r(?:ound)?_?${roundNum}_?result$`).test(rl);
          });
          if (resultIdx >= 0) {
            // Find corresponding feedback column (optional)
            const feedbackIdx = rawHeaders.findIndex((rh) => {
              const rl = rh.toLowerCase().replace(/\s+/g, "_");
              return new RegExp(`^r(?:ound)?_?${roundNum}_?feedback$`).test(rl);
            });
            detectedRounds.push({ interviewer: i, result: resultIdx, feedback: feedbackIdx });
            autoMappings[i] = `round_${detectedRounds.length}_interviewer`;
            autoMappings[resultIdx] = `round_${detectedRounds.length}_result`;
            if (feedbackIdx >= 0) {
              autoMappings[feedbackIdx] = `round_${detectedRounds.length}_feedback`;
            }
          }
        }
      }

      setMappings(autoMappings);
      setRoundMappings(detectedRounds);
      setStep(2);
    } catch {
      setError("Failed to parse CSV file.");
    }
  }

  function setMapping(idx: number, value: string) {
    setMappings((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function addRound() {
    setRoundMappings((prev) => [...prev, { interviewer: -1, result: -1, feedback: -1 }]);
  }

  function updateRoundMapping(roundIdx: number, field: "interviewer" | "result" | "feedback", colIdx: number) {
    setRoundMappings((prev) => {
      const next = [...prev];
      next[roundIdx] = { ...next[roundIdx], [field]: colIdx };
      return next;
    });
    // Update column mapping label
    setMappings((prev) => {
      const next = [...prev];
      next[colIdx] = `round_${roundIdx + 1}_${field}`;
      return next;
    });
  }

  function removeRound(roundIdx: number) {
    // Clear mappings for removed round columns
    const rm = roundMappings[roundIdx];
    setMappings((prev) => {
      const next = [...prev];
      if (rm.interviewer >= 0) next[rm.interviewer] = "ignore";
      if (rm.result >= 0) next[rm.result] = "ignore";
      if (rm.feedback >= 0) next[rm.feedback] = "ignore";
      return next;
    });
    setRoundMappings((prev) => prev.filter((_, i) => i !== roundIdx));
  }

  // Step 2 validation
  function validateStep2(): string | null {
    if (!mappings.includes("name")) return "Name column must be mapped.";
    if (!mappings.includes("email")) return "Email column must be mapped.";
    for (let i = 0; i < roundMappings.length; i++) {
      const rm = roundMappings[i];
      if (rm.interviewer < 0 || rm.result < 0) {
        return `Round ${i + 1}: both interviewer and result columns must be mapped.`;
      }
    }
    return null;
  }

  function handleStep2Next() {
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(3);
  }

  // Build candidate data from mappings
  function buildCandidates() {
    const nameIdx = mappings.indexOf("name");
    const emailIdx = mappings.indexOf("email");
    const phoneIdx = mappings.indexOf("phone");
    const roleIdx = mappings.indexOf("current_role");
    const resumeIdx = mappings.indexOf("resume_link");
    const collegeIdx = mappings.indexOf("college");
    const deptIdx = mappings.indexOf("department");

    return rows
      .map((values) => {
        const name = values[nameIdx]?.trim();
        const email = values[emailIdx]?.trim();
        if (!name || !email) return null;

        const rounds = roundMappings
          .map((rm) => {
            const interviewerEmail = values[rm.interviewer]?.trim();
            const result = values[rm.result]?.trim()?.toUpperCase()?.replace(/\s+/g, "_");
            if (!interviewerEmail || !result) return null;
            const feedback = rm.feedback >= 0 ? values[rm.feedback]?.trim() || undefined : undefined;
            return { interviewerEmail, result, feedback };
          })
          .filter(Boolean) as { interviewerEmail: string; result: string; feedback?: string }[];

        return {
          name,
          email,
          phone: phoneIdx >= 0 ? values[phoneIdx]?.trim() || undefined : undefined,
          currentRole: roleIdx >= 0 ? values[roleIdx]?.trim() || undefined : undefined,
          resumeLink: resumeIdx >= 0 ? values[resumeIdx]?.trim() || undefined : undefined,
          college: collegeIdx >= 0 ? values[collegeIdx]?.trim() || undefined : undefined,
          department: deptIdx >= 0 ? values[deptIdx]?.trim() || undefined : undefined,
          rounds: rounds.length > 0 ? rounds : undefined,
        };
      })
      .filter(Boolean);
  }

  function handleSubmit() {
    const candidates = buildCandidates();
    if (candidates.length === 0) {
      setError("No valid candidate rows found.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}/candidates/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidates }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload failed.");
          return;
        }
        router.refresh();
        setResult(data);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  // Preview data for step 3
  const previewCandidates = step === 3 ? buildCandidates().slice(0, 5) : [];
  const allCandidates = step === 3 ? buildCandidates() : [];
  const candidatesWithHistory = allCandidates.filter((c: any) => c?.rounds?.length > 0);

  // Result screen
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
                    {result.skipped} duplicate{result.skipped !== 1 ? "s" : ""} skipped.
                  </p>
                )}
                {(result.interviewsCreated ?? 0) > 0 && (
                  <p className="text-foreground-secondary mt-1">
                    {result.interviewsCreated} interview record{result.interviewsCreated !== 1 ? "s" : ""} created from history.
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
                <p className="font-medium text-[#D97706]">No new candidates were added.</p>
                <p className="text-foreground-secondary mt-1">
                  All {result.total} candidate{result.total !== 1 ? "s" : ""} already exist in this campaign.
                </p>
              </div>
            </div>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-[#FFDDA4]/20 border border-[#F59E0B]/30">
              <p className="text-sm font-medium text-[#D97706] mb-1">Warnings:</p>
              <ul className="text-xs text-foreground-secondary space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={handleClose} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover">
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? "Upload CSV — Select File" : step === 2 ? "Upload CSV — Map Interview History" : "Upload CSV — Preview & Upload"}>
      {/* Step 1: File Upload */}
      {step === 1 && (
        <form onSubmit={handleFileUpload} className="space-y-3">
          <div className="text-sm text-foreground-secondary mb-4 space-y-1">
            <p><strong className="text-foreground">Required columns:</strong> name, email</p>
            <p><strong className="text-foreground">Optional:</strong> phone, current_role, resume_link, college, department</p>
            <p><strong className="text-foreground">History:</strong> R1 Interviewer, R1 Result, R1 Feedback, R2 Interviewer, R2 Result, R2 Feedback, etc.</p>
          </div>
          <div>
            <label htmlFor="csv-file-hist" className="block text-sm font-medium mb-1 text-foreground">CSV file</label>
            <input
              id="csv-file-hist"
              name="file"
              type="file"
              accept=".csv"
              required
              className="w-full border border-border rounded p-2 bg-card text-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm file:font-medium file:hover:bg-primary-hover"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover">
              Next
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Interview Round Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Auto-detected fields summary */}
          <div className="p-3 rounded-lg bg-surface text-sm text-foreground-secondary">
            <p className="font-medium text-foreground mb-1">Auto-detected columns:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
              {mappings.map((m, i) =>
                m !== "ignore" && !String(m).startsWith("round_") ? (
                  <span key={i}>
                    <span className="text-foreground">{headers[i]}</span>
                    <span className="text-foreground-muted"> → {String(m).replace("_", " ")}</span>
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* Round mappings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Interview Rounds</p>
              <button
                type="button"
                onClick={addRound}
                className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover"
              >
                + Add Round
              </button>
            </div>
            {roundMappings.length === 0 && (
              <p className="text-sm text-foreground-muted py-4 text-center">No interview history columns detected. Click &quot;+ Add Round&quot; to map them manually.</p>
            )}
            <div className="space-y-3">
              {roundMappings.map((rm, ri) => (
                <div key={ri} className="p-3 bg-surface rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Round {ri + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRound(ri)}
                      className="text-foreground-muted hover:text-danger transition-colors"
                      title="Remove round"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-foreground-muted mb-1">Interviewer</label>
                      <select
                        value={rm.interviewer}
                        onChange={(e) => updateRoundMapping(ri, "interviewer", parseInt(e.target.value))}
                        className="w-full border border-border rounded px-2 py-1.5 bg-card text-foreground text-xs"
                      >
                        <option value={-1}>Select column...</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-foreground-muted mb-1">Result</label>
                      <select
                        value={rm.result}
                        onChange={(e) => updateRoundMapping(ri, "result", parseInt(e.target.value))}
                        className="w-full border border-border rounded px-2 py-1.5 bg-card text-foreground text-xs"
                      >
                        <option value={-1}>Select column...</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-foreground-muted mb-1">Feedback (optional)</label>
                      <select
                        value={rm.feedback}
                        onChange={(e) => updateRoundMapping(ri, "feedback", parseInt(e.target.value))}
                        className="w-full border border-border rounded px-2 py-1.5 bg-card text-foreground text-xs"
                      >
                        <option value={-1}>None</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setStep(1); setError(null); }} className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface">
              Back
            </button>
            <button type="button" onClick={handleStep2Next} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="text-sm text-foreground-secondary">
            <p><strong className="text-foreground">{allCandidates.length}</strong> candidate{allCandidates.length !== 1 ? "s" : ""} found</p>
            {candidatesWithHistory.length > 0 && (
              <p><strong className="text-foreground">{candidatesWithHistory.length}</strong> with prior interview data</p>
            )}
          </div>

          <div className="max-h-48 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-foreground-muted">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground-muted">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground-muted">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {previewCandidates.map((c: any, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{c.name}</td>
                    <td className="px-3 py-2 text-foreground-secondary">{c.email}</td>
                    <td className="px-3 py-2 text-foreground-secondary">
                      {c.rounds?.length
                        ? c.rounds.map((r: any, j: number) => (
                            <span key={j} className="inline-block mr-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                r.result === "HIRE" || r.result === "WEAK_HIRE"
                                  ? "bg-green-100 text-green-700"
                                  : r.result === "NO_HIRE"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                R{j + 1}: {r.result}
                              </span>
                            </span>
                          ))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allCandidates.length > 5 && (
              <p className="text-xs text-foreground-muted px-3 py-2 border-t border-border">
                ...and {allCandidates.length - 5} more
              </p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setStep(2); setError(null); }} className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface">
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
