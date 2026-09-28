"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    NexaNative?: {
      scheduleReminder?: (title: string, triggerAtMillis: number) => boolean;
      cancelReminder?: (triggerAtMillis: number, title: string) => boolean;
    };
  }
}

export default function NativeReminderSync() {
  useEffect(() => {
    if (!/NEXA-Android\//i.test(navigator.userAgent) || !window.NexaNative?.scheduleReminder) return;
    let stopped = false;
    const client = createClient();

    async function sync() {
      const { data: session } = await client.auth.getSession();
      const user = session.session?.user;
      if (!user || stopped) return;
      const now = new Date().toISOString();
      const horizon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await client
        .from("reminders")
        .select("id,title,remind_at")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .gte("remind_at", now)
        .lte("remind_at", horizon)
        .order("remind_at", { ascending: true })
        .limit(100);
      for (const reminder of data || []) {
        const timestamp = new Date(reminder.remind_at).getTime();
        if (Number.isFinite(timestamp) && timestamp > Date.now()) {
          try { window.NexaNative?.scheduleReminder?.(String(reminder.title), timestamp); } catch { /* native bridge unavailable */ }
        }
      }
    }

    void sync();
    const interval = window.setInterval(() => void sync(), 15000);
    return () => { stopped = true; window.clearInterval(interval); };
  }, []);

  return null;
}
