"use client";

import { useState } from "react";
import InterviewModeModal from "@/components/ui/InterviewModeModal";

export default function InterviewModeButton({
  campaignId,
  currentMode,
  currentRoomNumber,
  currentMeetLink,
}: {
  campaignId: string;
  currentMode: string | null;
  currentRoomNumber: string | null;
  currentMeetLink: string | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(currentMode);
  const [roomNumber, setRoomNumber] = useState(currentRoomNumber);
  const [meetLink, setMeetLink] = useState(currentMeetLink);

  // Build the status label for the button
  let statusLabel: string | null = null;
  if (mode === "offline" && roomNumber) {
    statusLabel = `Room ${roomNumber}`;
  } else if (mode === "online" && meetLink) {
    statusLabel = "Meet link set";
  } else if (mode) {
    statusLabel = mode === "offline" ? "Offline" : "Online";
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        Interview Mode
        {statusLabel && (
          <span className="bg-white/20 rounded px-1.5 py-0.5 text-xs">
            {statusLabel}
          </span>
        )}
      </button>

      {showModal && (
        <InterviewModeModal
          open
          onClose={() => setShowModal(false)}
          campaignId={campaignId}
          currentMode={mode}
          currentRoomNumber={roomNumber}
          currentMeetLink={meetLink}
          onSaved={(newMode, newRoom, newMeet) => {
            setMode(newMode);
            setRoomNumber(newRoom);
            setMeetLink(newMeet);
          }}
        />
      )}
    </>
  );
}
