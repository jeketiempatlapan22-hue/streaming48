import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LiveViewerCount = ({ isLive }: { isLive: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isLive) { setCount(0); return; }

    // Use a unique channel name to avoid conflict with LiveChat's "online-users" channel
    const channelName = `viewer-count-${Date.now()}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: "viewer-count-observer" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // Read from the main online-users channel if possible, otherwise use this channel
        try {
          const mainChannel = supabase.channel("online-users");
          const state = mainChannel.presenceState();
          const keys = Object.keys(state);
          if (keys.length > 0) {
            setCount(keys.length);
            return;
          }
        } catch {}
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe();

    // Poll presence state periodically as a fallback
    const interval = setInterval(() => {
      try {
        const channels = (supabase as any).getChannels?.() || [];
        const mainCh = channels.find((c: any) => c.topic === "realtime:online-users");
        if (mainCh) {
          const state = mainCh.presenceState();
          setCount(Object.keys(state).length);
        }
      } catch {}
    }, 5000);

    return () => {
      clearInterval(interval);
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
