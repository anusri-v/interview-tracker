"use client";

import { useEffect, useState } from "react";

type AssignmentToastProps = {
  candidateName: string;
  mode?: string | null;
  roomNumber?: string | null;
  meetLink?: string | null;
  onDismiss: () => void;
};

export default function AssignmentToast({
  candidateName,
  mode,
  roomNumber,
  meetLink,
  onDismiss,
}: AssignmentToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  let message: React.ReactNode;
  if (mode === "offline" && roomNumber) {
    message = (
      <>
        Send <strong>{candidateName}</strong> to <strong>Room {roomNumber}</strong>
      </>
    );
  } else if (mode === "online" && meetLink) {
    message = (
      <>
        Share Meet link with <strong>{candidateName}</strong>:{" "}
        <a
          href={meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary"
        >
          {meetLink}
        </a>
      </>
    );
  } else {
    message = (
      <>
        Interview assigned for <strong>{candidateName}</strong>!{" "}
        <span className="text-foreground-muted">(No room/link set by interviewer)</span>
      </>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-md bg-card border border-border rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-foreground">{message}</div>
        <button
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="text-foreground-muted hover:text-foreground transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
