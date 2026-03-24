import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LiveViewerCount = ({ isLive }: { isLive: boolean }) => {
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isLive) { setCount(0); return; }

    // Use a unique channel name with random suffix to avoid conflicts
    // with other components subscribing to the same presence channel
    const channelName = `online-users-viewer-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this viewer so they show up in the count
          await channel.track({ user: crypto.randomUUID().slice(0, 8), online_at: new Date().toISOString() });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  if (!isLive || count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1.5"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
        </span>
        <Users className="h-3 w-3 text-destructive" />
        <span className="text-xs font-bold text-destructive">{count}</span>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveViewerCount;
