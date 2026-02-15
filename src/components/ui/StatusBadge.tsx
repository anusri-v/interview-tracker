type BadgeVariant =
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing"
  | "in_pipeline"
  | "scheduled"
  | "ongoing"
  | "completed"
  | "hire"
  | "no_hire"
  | "weak_hire";

const variantStyles: Record<BadgeVariant, string> = {
  rejected: "bg-[#FFADAD] text-[#EF4444] border-[#EF4444]",
  selected: "bg-[#BBFED4] text-[#16A34A] border-[#22C55E]",
  interview_scheduled: "bg-[#FFDDA4] text-[#D97706] border-[#F59E0B]",
  interview_ongoing: "bg-[#AAD3DA] text-[#0891B2] border-[#06B6D4]",
  in_pipeline: "bg-[#E0E7FF] text-[#4F46E5] border-[#6366F1]",
  scheduled: "bg-[#FFDDA4] text-[#D97706] border-[#F59E0B]",
  ongoing: "bg-[#BBFED4] text-[#16A34A] border-[#22C55E]",
  completed: "bg-[#E0E7FF] text-[#4F46E5] border-[#6366F1]",
  hire: "bg-[#BBFED4] text-[#16A34A] border-[#22C55E]",
  no_hire: "bg-[#FFADAD] text-[#EF4444] border-[#EF4444]",
  weak_hire: "bg-[#FFDDA4] text-[#D97706] border-[#F59E0B]",
};

const variantLabels: Record<BadgeVariant, string> = {
  rejected: "Rejected",
  selected: "Selected",
  interview_scheduled: "Interview Scheduled",
  interview_ongoing: "Interview Ongoing",
  in_pipeline: "In Pipeline",
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  hire: "HIRE",
  no_hire: "NO HIRE",
  weak_hire: "WEAK HIRE",
};

export default function StatusBadge({
  variant,
  label,
}: {
  variant: BadgeVariant;
  label?: string;
}) {
  const styles = variantStyles[variant] ?? variantStyles.in_pipeline;
  const displayLabel = label ?? variantLabels[variant] ?? variant;

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${styles}`}
    >
      {displayLabel}
    </span>
  );
}
