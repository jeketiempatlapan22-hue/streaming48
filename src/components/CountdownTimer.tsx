import { useState, useEffect } from "react";

interface CountdownTimerProps {
  dateStr: string;
  timeStr: string;
}

const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
  // Try to parse Indonesian date format like "20 Maret 2026"
  const months: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Extract time (e.g. "19:00 WIB" -> 19:00)
  const timeMatch = timeStr?.match(/(\d{1,2})[:.:](\d{2})/);
  const hours = timeMatch ? parseInt(timeMatch[1]) : 0;
  const minutes = timeMatch ? parseInt(timeMatch[2]) : 0;

  // Try Indonesian format: "20 Maret 2026"
  const dateMatch = dateStr?.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthName = dateMatch[2].toLowerCase();
    const year = parseInt(dateMatch[3]);
    const month = months[monthName];
    if (month !== undefined) {
      const d = new Date(year, month, day, hours, minutes);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try ISO / standard format
  const d = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(d.getTime())) return d;

  return null;
};

const CountdownTimer = ({ dateStr, timeStr }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const target = parseDateTime(dateStr, timeStr);
    if (!target) return;

    const update = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        // Check if it's within 3 hours of start time (consider "live")
        if (diff > -10800000) {
          setIsLive(true);
          setIsPast(false);
        } else {
          setIsLive(false);
          setIsPast(true);
        }
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  if (isPast) {
    return (
      <span className="text-[10px] font-medium text-muted-foreground">Sudah berlalu</span>
    );
  }

  if (isLive) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-destructive animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        SEDANG LIVE
      </span>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;
  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {days > 0 && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">
          {days}h
        </span>
      )}
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
};

export default CountdownTimer;
