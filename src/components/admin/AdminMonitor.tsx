import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Key, Coins, Eye, Clock, TrendingUp, Activity, BarChart3 } from "lucide-react";

const AdminMonitor = () => {
  const [stats, setStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    blockedTokens: 0,
    expiredTokens: 0,
    activeSessions: 0,
    totalShows: 0,
    activeShows: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    totalCoinsCirculating: 0,
    totalUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [tokensRes, sessionsRes, showsRes, ordersRes, balancesRes, profilesRes] = await Promise.all([
        supabase.from("tokens").select("id, status, expires_at"),
        supabase.from("token_sessions").select("id").eq("is_active", true),
        supabase.from("shows").select("id, is_active"),
        supabase.from("coin_orders").select("id, status, coin_amount, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("coin_balances").select("balance"),
        supabase.from("profiles").select("id"),
      ]);

      const tokens = tokensRes.data || [];
      const now = new Date();
      const activeTokens = tokens.filter(t => t.status === "active" && (!t.expires_at || new Date(t.expires_at) > now));
      const blockedTokens = tokens.filter(t => t.status === "blocked");
      const expiredTokens = tokens.filter(t => t.expires_at && new Date(t.expires_at) < now && t.status !== "blocked");

      const shows = showsRes.data || [];
      const orders = ordersRes.data || [];
      const balances = balancesRes.data || [];

      setStats({
        totalTokens: tokens.length,
        activeTokens: activeTokens.length,
        blockedTokens: blockedTokens.length,
        expiredTokens: expiredTokens.length,
        activeSessions: sessionsRes.data?.length || 0,
        totalShows: shows.length,
        activeShows: shows.filter(s => s.is_active).length,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === "pending").length,
        confirmedOrders: orders.filter(o => o.status === "confirmed").length,
        totalCoinsCirculating: balances.reduce((sum, b) => sum + (b.balance || 0), 0),
        totalUsers: profilesRes.data?.length || 0,
      });

      setRecentOrders(orders.slice(0, 5));
      setLoading(false);
    };
    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Viewer Aktif", value: stats.activeSessions, icon: Eye, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
    { label: "Token Aktif", value: stats.activeTokens, icon: Key, color: "text-primary", bg: "bg-primary/10" },
    { label: "Token Blocked", value: stats.blockedTokens, icon: Key, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Token Expired", value: stats.expiredTokens, icon: Clock, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10" },
    { label: "Total User", value: stats.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Show Aktif", value: stats.activeShows, icon: Activity, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
    { label: "Koin Beredar", value: stats.totalCoinsCirculating, icon: Coins, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10" },
    { label: "Order Pending", value: stats.pendingOrders, icon: TrendingUp, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> Monitor
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value.toLocaleString("id-ID")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-[hsl(var(--warning))]" /> Order Koin Terbaru
        </h3>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Belum ada order</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{o.coin_amount} Koin</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                </div>
                <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold ${
                  o.status === "pending" ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                    : o.status === "confirmed" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                    : "bg-destructive/20 text-destructive"
                }`}>
                  {o.status === "pending" ? "PENDING" : o.status === "confirmed" ? "OK" : "TOLAK"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Token</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{stats.totalTokens}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Show</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{stats.totalShows}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Order Dikonfirmasi</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{stats.confirmedOrders}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminMonitor;
