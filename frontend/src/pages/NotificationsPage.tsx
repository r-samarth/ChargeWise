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
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="cw-eyebrow">Updates</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            Notification Centre & Activity
          </h1>
          <p className="text-[15px] text-[#475569]">
            Powered by Cloud Firestore with idempotent backend event synchronization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 cw-card p-6 space-y-4">
          <h2 className="text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
            <Bell size={18} className="text-[#2563EB]" aria-hidden="true" />
            <span>Notifications</span>
          </h2>

          {isLoading ? (
            <p className="text-[15px] text-[#475569]">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-[15px] text-[#475569]">
              No notifications found. Saving a trip creates a notification here.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 space-y-2.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="cw-card-muted p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[15px] font-semibold text-[#0F172A]">{n.title}</strong>
                      {!n.read && <span className="cw-pill cw-pill-accent">Unread</span>}
                    </div>
                    <p className="text-[13.5px] text-[#475569]">{n.message}</p>
                    <div className="flex items-center gap-3 pt-0.5 text-[11.5px] text-[#64748B] cw-num">
                      <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}</span>
                      {n.deepLink && (
                        <Link to={n.deepLink} className="font-semibold text-[#1D4ED8] hover:underline">
                          View journey
                        </Link>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => markReadMut.mutate({ id: n.id, read: !n.read })}
                    className="cw-btn-secondary !py-1.5 !px-3.5 shrink-0"
                  >
                    {n.read ? "Mark unread" : "Mark read"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5 cw-card p-6 space-y-4">
          <h2 className="text-[18px] font-bold text-[#0F172A]">Activity Feed</h2>
          {activities.length === 0 ? (
            <p className="text-[15px] text-[#475569]">No activity recorded yet.</p>
          ) : (
            <ul className="list-none p-0 m-0 space-y-2.5">
              {activities.map((a) => (
                <li key={a.id} className="cw-card-muted p-3.5 space-y-0.5">
                  <p className="text-[14px] font-semibold text-[#0F172A]">{a.title}</p>
                  <p className="text-[13px] text-[#475569]">{a.description}</p>
                  <p className="text-[11.5px] text-[#64748B] cw-num pt-0.5">
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
