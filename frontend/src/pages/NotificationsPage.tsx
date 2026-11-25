import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { ActivityItem, NotificationItem } from "../types/api";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();

  const { data: notifData, isLoading, error } = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () =>
      apiRequest<{
        items: NotificationItem[];
        nextCursor: string | null;
        firestoreAvailable: boolean;
      }>(`/notifications?unread_only=${unreadOnly}&limit=20`, { authRequired: true }),
  });

  const { data: activityData } = useQuery({
    queryKey: ["activity"],
    queryFn: () =>
      apiRequest<{
        items: ActivityItem[];
        firestoreAvailable: boolean;
      }>("/activity?limit=20", { authRequired: true }),
  });

  const markReadMut = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      apiRequest(`/notifications/${id}`, {
        method: "PATCH",
        authRequired: true,
        body: { read },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: () =>
      apiRequest("/notifications/read-all", { method: "PATCH", authRequired: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = notifData?.items || [];
  const activities = activityData?.items || [];

  return (
    <div className="max-w-[1120px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">
            Notification Centre & Activity
          </h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            Powered by Cloud Firestore with idempotent backend event synchronization.
          </p>
        </div>
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={unreadOnly ? "cw-btn-primary" : "cw-btn-secondary"}
          >
            {unreadOnly ? "Showing Unread" : "Show Unread Only"}
          </button>
          <button
            type="button"
            disabled={markAllMut.isPending || notifications.length === 0}
            onClick={() => markAllMut.mutate()}
            className="cw-btn-secondary"
          >
            <CheckCheck size={16} aria-hidden="true" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {notifData && !notifData.firestoreAvailable && (
        <StatusAlert
          title="Firestore inbox currently unavailable"
          message="ChargeWise could not reach Cloud Firestore right now. Trip calculations and vehicle data remain safely stored in PostgreSQL."
        />
      )}

      {error && (
        <StatusAlert title="Error loading inbox" message={(error as Error).message} variant="error" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px]">
        <section className="lg:col-span-7 cw-card p-[24px] space-y-[14px]">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0 flex items-center gap-[8px]">
            <Bell size={18} aria-hidden="true" />
            <span>Notifications</span>
          </h2>

          {isLoading ? (
            <p className="text-[15px] text-[#45474D] m-0">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-[15px] text-[#45474D] m-0">
              No notifications found. Saving a trip creates a notification here.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 space-y-[10px]">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="cw-card-muted p-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]"
                >
                  <div>
                    <div className="flex items-center gap-[8px]">
                      <strong className="text-[15px] text-[#121317]">{n.title}</strong>
                      {!n.read && <span className="cw-pill cw-pill-accent">Unread</span>}
                    </div>
                    <p className="text-[13px] text-[#45474D] mt-[4px] mb-0">{n.message}</p>
                    <div className="flex items-center gap-[10px] mt-[6px] text-[11px] text-[#6A6A71]">
                      <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}</span>
                      {n.deepLink && (
                        <Link to={n.deepLink} className="underline text-[#121317]">
                          View journey
                        </Link>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => markReadMut.mutate({ id: n.id, read: !n.read })}
                    className="cw-btn-secondary py-[5px] px-[12px] shrink-0"
                  >
                    {n.read ? "Mark unread" : "Mark read"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5 cw-card p-[24px] space-y-[14px]">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">Activity Feed</h2>
          {activities.length === 0 ? (
            <p className="text-[15px] text-[#45474D] m-0">No activity recorded yet.</p>
          ) : (
            <ul className="list-none p-0 m-0 space-y-[10px]">
              {activities.map((a) => (
                <li key={a.id} className="cw-card-muted p-[12px]">
                  <p className="text-[14px] font-medium text-[#121317] m-0">{a.title}</p>
                  <p className="text-[13px] text-[#45474D] mt-[2px] mb-0">{a.description}</p>
                  <p className="text-[11px] text-[#6A6A71] mt-[4px] mb-0">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : "Recent"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
