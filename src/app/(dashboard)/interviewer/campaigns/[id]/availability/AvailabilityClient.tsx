"use client";

import { useState, useTransition } from "react";

type Slot = { id: string; startTime: string };

export default function AvailabilityClient({
  campaignId,
  existingSlots,
  addSlots,
  removeSlot,
}: {
  campaignId: string;
  existingSlots: Slot[];
  addSlots: (startTimes: string[]) => Promise<void>;
  removeSlot: (slotId: string) => Promise<void>;
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const hours = Array.from({ length: 11 }, (_, i) => i + 9); // 9 AM – 7 PM start

  function toggleHour(hour: number) {
    const iso = new Date(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`).toISOString();
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function isExisting(hour: number) {
    const iso = new Date(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`).toISOString();
    return existingSlots.some((s) => s.startTime === iso);
  }

  function handleSave() {
    const times = Array.from(toggled);
    if (times.length === 0) return;
    startTransition(async () => {
      await addSlots(times);
      setToggled(new Set());
    });
  }

  function handleRemove(slotId: string) {
    startTransition(async () => {
      await removeSlot(slotId);
    });
  }

  // Group existing future slots by date
  const now = new Date();
  const futureSlots = existingSlots
    .filter((s) => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const slotsByDate: Record<string, Slot[]> = {};
  for (const s of futureSlots) {
    const dateKey = new Date(s.startTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!slotsByDate[dateKey]) slotsByDate[dateKey] = [];
    slotsByDate[dateKey].push(s);
  }

  function formatHour(h: number) {
    if (h === 0 || h === 12) return `12 ${h < 12 ? "AM" : "PM"}`;
    return `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;
  }

  function formatSlotTime(iso: string) {
    const d = new Date(iso);
    const h = d.getHours();
    return `${formatHour(h)} – ${formatHour(h + 1)}`;
  }

  // Get today string for min date
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Add slots section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Add Availability Slots</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            min={todayStr}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setToggled(new Set());
            }}
            className="border border-border rounded px-3 py-2 bg-card text-foreground"
          />
        </div>

        <div className="mb-4">
          <p className="text-sm text-foreground-secondary mb-2">
            Click to toggle 1-hour slots for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {hours.map((h) => {
              const iso = new Date(`${selectedDate}T${String(h).padStart(2, "0")}:00:00`).toISOString();
              const selected = toggled.has(iso);
              const existing = isExisting(h);
              return (
                <button
                  key={h}
                  onClick={() => !existing && toggleHour(h)}
                  disabled={existing}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    existing
                      ? "bg-surface text-foreground-muted border-border cursor-not-allowed opacity-50"
                      : selected
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-foreground border-border hover:bg-surface"
                  }`}
                >
                  {formatHour(h)} – {formatHour(h + 1)}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || toggled.size === 0}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : `Save ${toggled.size} Slot${toggled.size !== 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Existing slots section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Your Upcoming Slots</h2>

        {Object.keys(slotsByDate).length === 0 ? (
          <p className="text-sm text-foreground-muted">No upcoming availability slots.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(slotsByDate).map(([dateLabel, slots]) => (
              <div key={dateLabel}>
                <h3 className="text-sm font-medium text-foreground-secondary mb-2">{dateLabel}</h3>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <div
                      key={s.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm"
                    >
                      <span className="text-foreground">{formatSlotTime(s.startTime)}</span>
                      <button
                        onClick={() => handleRemove(s.id)}
                        disabled={isPending}
                        className="text-foreground-muted hover:text-danger transition-colors disabled:opacity-50"
                        title="Remove slot"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
