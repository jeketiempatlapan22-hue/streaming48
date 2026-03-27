import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// In-memory session cache to avoid redundant getSession() calls
let cachedUser: User | null = null;
let cachedIsAdmin: boolean = false;
let cacheReady = false;

// Lightweight ban check — non-blocking, with timeout and graceful fallback
async function checkBanSafe(userId: string): Promise<{ banned: boolean; reason: string }> {
  try {
    const result = await Promise.race([
      (supabase.rpc as any)('get_ban_info', { _user_id: userId }),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 3000)),
    ]);
    const info = result?.data as any;
    if (info?.banned) return { banned: true, reason: info.reason || '' };
    return { banned: false, reason: '' };
  } catch {
    return { banned: false, reason: '' };
  }
}

async function checkAdminSafe(userId: string): Promise<boolean> {
  try {
    // Race against a 6s timeout to prevent hanging
    const result = await Promise.race([
      Promise.resolve(supabase.rpc("has_role", { _user_id: userId, _role: "admin" })),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "Admin check timeout" } }), 6000)
      ),
    ]);
    return !!result.data;
  } catch {
    return cachedIsAdmin; // preserve last known state on error
  }
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [isAdmin, setIsAdmin] = useState(cachedIsAdmin);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(!cacheReady);
  const adminCheckRef = useRef<string | null>(null);

  useEffect(() => {
    let banChannel: any = null;

    const setupBanListener = (userId: string) => {
      // Clean up previous listener
      if (banChannel) supabase.removeChannel(banChannel);
      banChannel = supabase.channel(`user-ban-${userId}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_bans", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const row = payload.new as any;
          if (row?.is_active) {
            setIsBanned(true);
            setBanReason(row.reason || "Akun Anda telah diblokir");
          } else {
            setIsBanned(false);
            setBanReason("");
          }
        }
      ).subscribe();
    };

    // Set up listener FIRST (per Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        cachedUser = currentUser;
        setUser(currentUser);

        if (currentUser) {
          if (adminCheckRef.current !== currentUser.id) {
            adminCheckRef.current = currentUser.id;
            const isAdm = await checkAdminSafe(currentUser.id);
            cachedIsAdmin = isAdm;
            setIsAdmin(isAdm);
            checkBanSafe(currentUser.id).then((b) => {
              setIsBanned(b.banned);
              setBanReason(b.reason);
            });
            setupBanListener(currentUser.id);
          }
        } else {
          adminCheckRef.current = null;
          cachedIsAdmin = false;
          setIsAdmin(false);
          setIsBanned(false);
          setBanReason("");
          if (banChannel) { supabase.removeChannel(banChannel); banChannel = null; }
        }
        cacheReady = true;
        setLoading(false);
      }
    );

    // Only call getSession if cache is empty — with timeout
    if (!cacheReady) {
      Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 8000)
        ),
      ]).then(async ({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        cachedUser = currentUser;
        setUser(currentUser);
        if (currentUser && adminCheckRef.current !== currentUser.id) {
          adminCheckRef.current = currentUser.id;
          const isAdm = await checkAdminSafe(currentUser.id);
          cachedIsAdmin = isAdm;
          setIsAdmin(isAdm);
          checkBanSafe(currentUser.id).then((b) => {
            setIsBanned(b.banned);
            setBanReason(b.reason);
          });
          setupBanListener(currentUser.id);
        }
        cacheReady = true;
        setLoading(false);
      }).catch(() => {
        cacheReady = true;
        setLoading(false);
      });
    }

    return () => {
      subscription.unsubscribe();
      if (banChannel) supabase.removeChannel(banChannel);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    cachedUser = null;
    cachedIsAdmin = false;
    cacheReady = false;
    adminCheckRef.current = null;
    setUser(null);
    setIsAdmin(false);
    setIsBanned(false);
    setBanReason("");
  };

  return { user, isAdmin, isBanned, banReason, loading, signOut };
};
