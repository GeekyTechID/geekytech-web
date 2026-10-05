import { createClient } from "@/lib/supabase/server";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

async function fetchAnnouncement(): Promise<{ text: string; link?: string } | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "announcement_enabled",
        "announcement_text",
        "announcement_link",
      ]);

    if (!data) return null;

    const byKey = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const enabled = byKey["announcement_enabled"];
    const text = byKey["announcement_text"] as string | undefined;

    if (!enabled || enabled === "false" || !text) return null;

    return { text, link: byKey["announcement_link"] as string | undefined };
  } catch {
    return null;
  }
}

export async function AnnouncementBarServer() {
  const announcement = await fetchAnnouncement();
  if (!announcement) return null;
  return <AnnouncementBar text={announcement.text} link={announcement.link} />;
}
