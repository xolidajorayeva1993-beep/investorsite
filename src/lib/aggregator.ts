import type { ProjectCard, ProjectStats, AggregatedStats } from "./types";
import { USD_UZS_RATE } from "./constants";
import { readPlatformConfig } from "./platform-config";

/** Bitta loyixa API'sidan stats tortish */
async function fetchProjectStats(statsUrl: string): Promise<ProjectStats | null> {
  if (!statsUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(statsUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "ngrok-skip-browser-warning": "1" },
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const json = await res.json();
    // API javob formati: { success: true, data: { ... } } yoki to'g'ridan-to'g'ri data
    const data = json.data ?? json;

    return {
      state: data.state ?? "online",
      monthlyRevenueUsd: Number(data.monthlyRevenueUsd) || 0,
      activePayingClients: Number(data.activePayingClients) || 0,
      newClients30d: Number(data.newClients30d) || 0,
      syncEventsToday: Number(data.syncEventsToday) || 0,
      lastSync: data.lastSync ?? new Date().toISOString(),
      source: data.source ?? "unknown",
      totalUsers: Number(data.totalUsers) || 0,
      freeUsers: Number(data.freeUsers) || 0,
      paidUsers: Number(data.paidUsers) || Number(data.activePayingClients) || 0,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/** Barcha loyihalardan real ma'lumot yig'ish (platform_config.json dan) */
export async function aggregateAllStats(): Promise<AggregatedStats> {
  const config = await readPlatformConfig();
  const activeProjects = config.projects.filter((p) => p.active !== false);

  const results = await Promise.allSettled(
    activeProjects.map((p) => fetchProjectStats(p.statsUrl))
  );

  let totalRevenueUsd = 0;
  let totalClients = 0;
  let totalNew30d = 0;
  let onlineCount = 0;

  const projects: ProjectCard[] = activeProjects.map((p, i) => {
    const result = results[i];
    const stats = result.status === "fulfilled" ? result.value : null;

    if (stats) {
      totalRevenueUsd += stats.monthlyRevenueUsd;
      totalClients += stats.activePayingClients;
      totalNew30d += stats.newClients30d;
      if (stats.state === "online") onlineCount++;
    }

    return {
      key: p.key,
      name: p.name,
      description: p.description,
      url: p.url,
      apiDocsUrl: p.apiDocsUrl,
      icon: p.icon || "📦",
      gradient: p.gradient || "from-gray-500/10 to-slate-500/10",
      tagline: p.tagline || "",
      problem: p.problem || "",
      solution: p.solution || "",
      audience: p.audience || "",
      model: p.model || "",
      stats,
      error: !stats ? "API ulanmagan" : undefined,
    };
  });

  return {
    projects,
    totals: {
      monthlyRevenueUsd: totalRevenueUsd,
      monthlyRevenueUzs: Math.round(totalRevenueUsd * USD_UZS_RATE),
      activePayingClients: totalClients,
      newClients30d: totalNew30d,
      onlineProjects: onlineCount,
    },
    fetchedAt: new Date().toISOString(),
  };
}
