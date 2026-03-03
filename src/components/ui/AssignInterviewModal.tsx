"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type Interviewer = { id: string; name: string | null; email: string; hasOngoing?: boolean; hasScheduled?: boolean };

type InterviewerSetting = {
  interviewerId: string;
  mode?: string | null;
  roomNumber?: string | null;
  meetLink?: string | null;
};

export default function AssignInterviewModal({
  open,
  onClose,
  candidateId,
  candidateName,
  round,
  interviewers,
  existingInterviewerIds,
  completedInterviewerIds = [],
  assignInterviewer,
  assignPanel,
  campaignType,
  interviewerSlots = [],
  interviewerSettings = [],
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  round: number;
  interviewers: Interviewer[];
  existingInterviewerIds: string[];
  completedInterviewerIds?: string[];
  assignInterviewer: (candidateId: string, formData: FormData) => Promise<void>;
  assignPanel?: (candidateId: string, formData: FormData) => Promise<void>;
  campaignType?: string;
  interviewerSlots?: { id: string; interviewerId: string; startTime: string }[];
  interviewerSettings?: InterviewerSetting[];
  onAssigned?: (info: { candidateName: string; mode?: string | null; roomNumber?: string | null; meetLink?: string | null } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const isFresher = campaignType === "fresher";

  // Panel mode state (fresher only)
  const [panelMode, setPanelMode] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  // Filter out interviewers with active (non-completed) interviews for this candidate
  const activeInterviewerIds = existingInterviewerIds.filter(
    (id) => !completedInterviewerIds.includes(id)
  );

  const availableInterviewers = interviewers.filter(
    (u) => !activeInterviewerIds.includes(u.id)
  );

  const filteredInterviewers = availableInterviewers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Slot counts per interviewer
  const slotCountMap: Record<string, number> = {};
  for (const s of interviewerSlots) {
    slotCountMap[s.interviewerId] = (slotCountMap[s.interviewerId] || 0) + 1;
  }

  // Settings lookup
  const settingMap: Record<string, InterviewerSetting> = {};
  for (const s of interviewerSettings) {
    settingMap[s.interviewerId] = s;
  }

  // Slots for selected interviewer
  const selectedSlots = interviewerSlots
    .filter((s) => s.interviewerId === selectedId)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  function formatSlotChip(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getSettingBadge(userId: string) {
    const setting = settingMap[userId];
    if (!setting?.mode) return null;
    if (setting.mode === "offline" && setting.roomNumber) {
      return (
        <span className="text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
          Room {setting.roomNumber}
        </span>
      );
    }
    if (setting.mode === "online" && setting.meetLink) {
      return (
        <span className="text-xs bg-teal-100 text-teal-700 border border-teal-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
          Meet link set
        </span>
      );
    }
    return null;
  }

  function togglePanelId(id: string) {
    setSelectedPanelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (panelMode && assignPanel) {
      if (selectedPanelIds.length < 2) return;
      const formData = new FormData();
      for (const id of selectedPanelIds) {
        formData.append("interviewerIds", id);
      }
      const scheduledAt = formRef.current?.querySelector<HTMLInputElement>(
        'input[name="scheduledAt"]'
      )?.value;
      if (scheduledAt) formData.set("scheduledAt", scheduledAt);
      startTransition(async () => {
        await assignPanel(candidateId, formData);
        router.refresh();
        if (onAssigned) {
          // For panel, use the first selected interviewer's setting
          const setting = settingMap[selectedPanelIds[0]];
          onAssigned({
            candidateName,
            mode: setting?.mode,
            roomNumber: setting?.roomNumber,
            meetLink: setting?.meetLink,
          });
        }
        onClose();
      });
      return;
    }

    if (!selectedId) return;
    const formData = new FormData();
    formData.set("interviewerId", selectedId);
    const scheduledAt = formRef.current?.querySelector<HTMLInputElement>(
      'input[name="scheduledAt"]'
    )?.value;
    if (scheduledAt) formData.set("scheduledAt", scheduledAt);
    startTransition(async () => {
      await assignInterviewer(candidateId, formData);
      router.refresh();
      if (onAssigned) {
        const setting = settingMap[selectedId];
        onAssigned({
          candidateName,
          mode: setting?.mode,
          roomNumber: setting?.roomNumber,
          meetLink: setting?.meetLink,
        });
      }
      onClose();
    });
  }

  const canSubmit = panelMode
    ? selectedPanelIds.length >= 2
    : !!selectedId;

  return (
    <Modal open={open} onClose={onClose} title="Assign Interview">
      <p className="text-sm text-foreground-secondary mb-4">
        Assigning <strong className="text-foreground">Round {round}</strong> for{" "}
        <strong className="text-foreground">{candidateName}</strong>
      </p>

      {/* Panel mode toggle — fresher campaigns only */}
      {isFresher && assignPanel && (
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-surface border border-border">
          <button
            type="button"
            onClick={() => { setPanelMode(false); setSelectedPanelIds([]); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              !panelMode ? "bg-primary text-white" : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => { setPanelMode(true); setSelectedId(""); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              panelMode ? "bg-primary text-white" : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            Panel
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            {panelMode ? "Select Interviewers (2+)" : "Select Interviewer"}
          </label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground mb-2 text-sm"
          />
          <div className="max-h-60 overflow-y-auto border border-border rounded bg-card">
            {filteredInterviewers.length === 0 ? (
              <p className="text-xs text-foreground-muted p-3">
                No interviewers found.
              </p>
            ) : (
              filteredInterviewers.map((u) => {
                const alreadyInterviewed = completedInterviewerIds.includes(u.id);
                const isSelected = panelMode
                  ? selectedPanelIds.includes(u.id)
                  : selectedId === u.id;
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 flex-wrap px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors ${
                      isSelected ? "bg-surface" : ""
                    }`}
                  >
                    {panelMode ? (
                      <input
                        type="checkbox"
                        checked={selectedPanelIds.includes(u.id)}
                        onChange={() => togglePanelId(u.id)}
                        className="accent-primary flex-shrink-0"
                      />
                    ) : (
                      <input
                        type="radio"
                        name="interviewerRadio"
                        value={u.id}
                        checked={selectedId === u.id}
                        onChange={() => setSelectedId(u.id)}
                        className="accent-primary flex-shrink-0"
                      />
                    )}
                    <span className="text-sm text-foreground truncate">
                      {u.name || u.email}
                      {u.name && (
                        <span className="text-foreground-muted ml-1">
                          ({u.email})
                        </span>
                      )}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                      {getSettingBadge(u.id)}
                      {campaignType === "lateral" && slotCountMap[u.id] > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                          {slotCountMap[u.id]} slot{slotCountMap[u.id] !== 1 ? "s" : ""}
                        </span>
                      )}
                      {alreadyInterviewed && (
                        <span className="text-xs bg-[#FFDDA4] text-[#D97706] border border-[#F59E0B] rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                          already interviewed
                        </span>
                      )}
                      {u.hasOngoing && (
                        <span className="text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                          ongoing interview
                        </span>
                      )}
                      {u.hasScheduled && !u.hasOngoing && (
                        <span className="text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                          upcoming interview
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
        {campaignType === "lateral" && selectedId && selectedSlots.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Available Slots
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedSlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const d = new Date(s.startTime);
                    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16);
                    const input = formRef.current?.querySelector<HTMLInputElement>(
                      'input[name="scheduledAt"]'
                    );
                    if (input) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                      )?.set;
                      nativeInputValueSetter?.call(input, local);
                      input.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {formatSlotChip(s.startTime)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label
            htmlFor="assign-scheduledAt"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            Scheduled at (optional)
          </label>
          <input
            id="assign-scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending
              ? "Assigning..."
              : panelMode
              ? `Assign Panel (${selectedPanelIds.length})`
              : "Assign Interview"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
