import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AssignInterviewersButton from "./AssignInterviewersButton";
import MarkCampaignCompletedButton from "./MarkCampaignCompletedButton";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

type DisplayStatus =
  | "in_pipeline"
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing";

function getDisplayStatus(c: { status: string; interviews: { status: string }[] }): DisplayStatus {
  if (c.status === "rejected") return "rejected";
  if (c.status === "selected") return "selected";
  if (c.interviews.some((i) => i.status === "ongoing")) return "interview_ongoing";
  if (c.interviews.some((i) => i.status === "scheduled")) return "interview_scheduled";
  return "in_pipeline";
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: {
          interviews: {
            select: {
              status: true,
              scheduledAt: true,
            },
          },
        },
      },
    },
  });
  if (!campaign) notFound();

  const isActive = campaign.status === "active";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">{campaign.name}</h1>
          <span className="inline-flex items-center gap-2 text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                campaign.status === "active" ? "bg-success" : "bg-foreground-muted"
              }`}
            />
            <span className={campaign.status === "active" ? "text-success" : "text-foreground-secondary"}>
              {campaign.status === "active" ? "Active" : "Completed"}
            </span>
          </span>
          {isActive && (
            <MarkCampaignCompletedButton campaignId={id} campaignName={campaign.name} />
          )}
        </div>
        <div className="flex gap-3">
          <a
            href={`/api/admin/campaigns/${id}/candidates/export`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            download
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </a>
          {isActive && (
            <>
              <Link
                href={`/admin/campaigns/${id}/candidates/new`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Candidate
              </Link>
              <Link
                href={`/admin/campaigns/${id}/candidates/upload`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload CSV
              </Link>
            </>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold text-foreground tracking-tight mb-4">
          Candidates ({campaign.candidates.length})
        </h2>
        {campaign.candidates.length === 0 ? (
          <p className="text-foreground-muted">No candidates yet. Add one or upload a CSV.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-base">
              <thead className="bg-surface">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Email</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Phone</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Role</th>
                  {isActive && <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {campaign.candidates.map((c) => {
                  const displayStatus = getDisplayStatus(c);

                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/candidates/${c.id}/details`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.email}</td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.phone ?? "—"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge variant={displayStatus} />
                      </td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.role ?? "—"}</td>
                      {isActive && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/candidates/${c.id}/edit`}
                              className="text-foreground-secondary hover:text-foreground transition-colors"
                              title="Edit status"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </Link>
                            <AssignInterviewersButton
                              candidateId={c.id}
                              candidateName={c.name}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
