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
      className="text-blue-600 hover:underline text-sm"
    >
      Assign interviewers
    </Link>
  );
}
