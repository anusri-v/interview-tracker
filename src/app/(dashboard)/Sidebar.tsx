"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useResolvedCampaignId } from "@/hooks/useResolvedCampaignId";

type Campaign = { id: string; name: string };

type SidebarProps = {
  isAdmin: boolean;
  email: string;
  role: string;
  campaigns: Campaign[];
  basePath: "admin" | "interviewer";
  defaultCampaignId: string | null;
};

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function InterviewsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function CandidatesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CampaignsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

function AdminsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

export default function Sidebar({
  isAdmin,
  email,
  role,
  campaigns,
  basePath,
  defaultCampaignId,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Campaign dropdown logic (same as CampaignDropdown), with session persistence
  const campaignPrefix = `/${basePath}/campaigns/`;
  const isMyInterviewsPage =
    pathname === "/interviewer/interviews" || pathname.startsWith("/interviewer/interviews/");
  const isAdminDashboardPage = basePath === "admin" && pathname === "/admin";
  const isInterviewerDashboardPage = basePath === "interviewer" && pathname === "/interviewer";
  const isCampaignSubpath = pathname.startsWith(campaignPrefix);

  const currentIdFromPath = isCampaignSubpath
    ? pathname.slice(campaignPrefix.length).split("/")[0]
    : "";
  const campaignIdFromQuery =
    isMyInterviewsPage || isAdminDashboardPage || isInterviewerDashboardPage
      ? searchParams.get("campaignId")
      : null;

  const useQueryOrPathForDashboard =
    isMyInterviewsPage || isAdminDashboardPage || isInterviewerDashboardPage;
  const { selectedId, persistCampaignId } = useResolvedCampaignId({
    basePath,
    campaigns,
    defaultCampaignId,
    currentIdFromPath,
    campaignIdFromQuery,
    useQueryOrPathForDashboard,
  });

  function handleCampaignChange(id: string) {
    persistCampaignId(id || null);
    if (isMyInterviewsPage) {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("campaignId", id);
      else params.delete("campaignId");
      const q = params.toString();
      router.push(`${pathname}${q ? `?${q}` : ""}`);
    } else if (isAdminDashboardPage) {
      router.push(id ? `/admin?campaignId=${id}` : "/admin");
    } else if (isInterviewerDashboardPage) {
      router.push(id ? `/interviewer?campaignId=${id}` : "/interviewer");
    } else if (isCampaignSubpath && id) {
      const afterPrefix = pathname.slice(campaignPrefix.length);
      const segments = afterPrefix.split("/").filter(Boolean);
      const rest = segments.slice(1).join("/");
      const newPath = `/${basePath}/campaigns/${id}${rest ? `/${rest}` : ""}`;
      router.push(newPath);
    } else if (id) {
      router.push(`/${basePath}/campaigns/${id}`);
    }
  }

  // Determine candidates href: use campaign from path when on campaign subpath, else session/default
  const campaignIdMatch = pathname.match(/^\/(admin|interviewer)\/campaigns\/([^/]+)/);
  const candidatesCampaignId = campaignIdMatch?.[2] ?? (selectedId || defaultCampaignId);
  const candidatesHref = candidatesCampaignId
    ? `/${basePath}/campaigns/${candidatesCampaignId}/candidates`
    : isAdmin ? "/admin/candidates" : `/interviewer`;

  // Build campaign-aware hrefs so navigation preserves the selected campaign
  const campaignQuery = selectedId ? `?campaignId=${selectedId}` : "";

  // Nav items based on role
  const navItems = isAdmin
    ? [
        { href: `/admin${campaignQuery}`, label: "Dashboard", icon: DashboardIcon, match: (p: string) => p === "/admin" },
        { href: `/interviewer/interviews${campaignQuery}`, label: "My Interviews", icon: InterviewsIcon, match: (p: string) => p.startsWith("/interviewer/interviews") },
        { href: candidatesHref, label: "Candidates", icon: CandidatesIcon, match: (p: string) => p.includes("/candidates") },
        { href: "/admin/campaigns", label: "Campaigns", icon: CampaignsIcon, match: (p: string) => p === "/admin/campaigns" || p === "/admin/campaigns/new" },
        { href: "/admin/users", label: "Manage Admins", icon: AdminsIcon, match: (p: string) => p === "/admin/users" },
      ]
    : [
        { href: `/interviewer${campaignQuery}`, label: "Dashboard", icon: DashboardIcon, match: (p: string) => p === "/interviewer" },
        { href: `/interviewer/interviews${campaignQuery}`, label: "My Interviews", icon: InterviewsIcon, match: (p: string) => p.startsWith("/interviewer/interviews") },
        { href: candidatesHref, label: "Candidates", icon: CandidatesIcon, match: (p: string) => p.includes("/candidates") || p.match(/^\/interviewer\/campaigns\/[^/]+$/) !== null },
      ];

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[250px] bg-sidebar flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link
          href={isAdmin ? "/admin" : "/interviewer"}
          className="text-lg font-bold text-foreground tracking-tight"
        >
          Interview Tracker
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground-secondary hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}

        {/* Log out */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-foreground/5 transition-colors w-full"
        >
          <LogOutIcon />
          Log out
        </button>
      </nav>

      {/* Campaign selector */}
      {campaigns.length > 0 && (
        <div className="px-4 py-3 border-t border-border/50">
          <label
            htmlFor="sidebar-campaign"
            className="block text-xs font-medium text-foreground-muted mb-1.5"
          >
            Campaign
          </label>
          <select
            id="sidebar-campaign"
            value={selectedId}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-2.5 py-2 bg-card text-foreground"
          >
            <option value="">— Select —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Theme toggle */}
      <div className="px-4 py-2 border-t border-border/50">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-foreground/5 transition-colors w-full"
        >
          {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          {mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "\u00A0"}
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-t border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{email}</p>
          <p className="text-xs text-foreground-muted capitalize">{role}</p>
        </div>
      </div>
    </aside>
  );
}
