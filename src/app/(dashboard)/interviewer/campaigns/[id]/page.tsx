import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

export default async function InterviewerCampaignCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: {
      id,
      candidates: {
        some: {
          interviews: { some: { interviewerId: session.user.id } },
        },
      },
    },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: {
          interviews: {
            where: { interviewerId: session.user.id! },
            select: { id: true, status: true },
          },
        },
      },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="space-y-8">
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
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4 text-foreground tracking-tight">Candidates ({campaign.candidates.length})</h2>
        {campaign.candidates.length === 0 ? (
          <p className="text-foreground-muted">No candidates in this campaign.</p>
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
                  <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Your Interview</th>
                </tr>
              </thead>
              <tbody>
                {campaign.candidates.map((c) => {
                  const myInterview = c.interviews[0];
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-4 text-foreground font-medium">{c.name}</td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.email}</td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.phone ?? "—"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          variant={
                            c.status === "rejected"
                              ? "rejected"
                              : c.status === "selected"
                                ? "selected"
                                : "in_pipeline"
                          }
                        />
                      </td>
                      <td className="px-5 py-4 text-foreground-secondary">{c.role ?? "—"}</td>
                      <td className="px-5 py-4">
                        {myInterview ? (
                          <Link
                            href={`/interviewer/interviews/${myInterview.id}`}
                            className="text-primary hover:text-primary-hover font-medium transition-colors"
                          >
                            {myInterview.status === "completed"
                              ? "View"
                              : myInterview.status === "ongoing"
                                ? "Continue"
                                : "Start"}
                          </Link>
                        ) : (
                          <span className="text-foreground-muted">—</span>
                        )}
                      </td>
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
