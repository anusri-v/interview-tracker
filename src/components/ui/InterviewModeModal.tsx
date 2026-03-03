"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function InterviewModeModal({
  open,
  onClose,
  campaignId,
  currentMode,
  currentRoomNumber,
  currentMeetLink,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  currentMode: string | null;
  currentRoomNumber: string | null;
  currentMeetLink: string | null;
  onSaved?: (mode: string, roomNumber: string | null, meetLink: string | null) => void;
}) {
  const [mode, setMode] = useState<"online" | "offline">(
    (currentMode as "online" | "offline") || "offline"
  );
  const [roomNumber, setRoomNumber] = useState(currentRoomNumber || "");
  const [meetLink, setMeetLink] = useState(currentMeetLink || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/interviewer/campaign-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          mode,
          roomNumber: mode === "offline" ? roomNumber : undefined,
          meetLink: mode === "online" ? meetLink : undefined,
        }),
      });
      if (res.ok) {
        onSaved?.(
          mode,
          mode === "offline" ? roomNumber || null : null,
          mode === "online" ? meetLink || null : null
        );
        onClose();
      } else {
        setError("Failed to save. Please try again.");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Interview Mode">
      <p className="text-sm text-foreground-secondary mb-4">
        Set your interview mode for this campaign. This helps admins direct candidates to the right location.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="interviewMode"
              checked={mode === "offline"}
              onChange={() => setMode("offline")}
              className="accent-primary"
            />
            <span className="text-sm text-foreground font-medium">Offline</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="interviewMode"
              checked={mode === "online"}
              onChange={() => setMode("online")}
              className="accent-primary"
            />
            <span className="text-sm text-foreground font-medium">Online</span>
          </label>
        </div>

        {mode === "offline" ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Room Number
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. Room 5"
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Google Meet Link
            </label>
            <input
              type="text"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="e.g. https://meet.google.com/abc-defg-hij"
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
