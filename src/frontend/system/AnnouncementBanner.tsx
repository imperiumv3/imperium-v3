import { useEffect, useState } from "react";
import { getActiveAnnouncement } from "@/lib/user-system.functions";
import "../admin/admin.css";

type Ann = { title: string; message: string };

export function AnnouncementBanner() {
  const [ann, setAnn] = useState<Ann | null>(null);
  useEffect(() => {
    let cancel = false;
    getActiveAnnouncement().then((r) => { if (!cancel && r) setAnn(r as Ann); }).catch(() => {});
    return () => { cancel = true; };
  }, []);
  if (!ann) return null;
  return (
    <div className="announce-banner">
      <div className="title">{ann.title}</div>
      <div className="msg">{ann.message}</div>
    </div>
  );
}
