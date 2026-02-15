"use client";

import Link from "next/link";

export default function AssignInterviewersButton({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  return (
    <Link
      href={`/admin/candidates/${candidateId}/assign`}
      className="text-primary hover:underline text-sm"
    >
      Assign interview
    </Link>
  );
}
