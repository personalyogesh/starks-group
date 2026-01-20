"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import {
  ArrowLeft,
  Award,
  Calendar,
  Check,
  Heart,
  MessageCircle,
  Trash2,
  UserPlus,
} from "lucide-react";

type NotifType = "like" | "comment" | "follow" | "event" | "general";

type Notif = {
  id: string;
  type: NotifType;
  fromUser: string;
  fromAvatar?: string;
  message: string;
  content?: string;
  timestampMs: number;
  read: boolean;
  postId?: string;
  eventId?: string;
};

function formatTimeAgo(ms: number) {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function NotifIcon({ type }: { type: NotifType }) {
  switch (type) {
    case "like":
      return <Heart className="size-4 text-rose-600 fill-rose-600" />;
    case "comment":
      return <MessageCircle className="size-4 text-blue-600" />;
    case "follow":
      return <UserPlus className="size-4 text-emerald-600" />;
    case "event":
      return <Calendar className="size-4 text-purple-600" />;
    default:
      return <Award className="size-4 text-slate-600" />;
  }
}

// Mock notifications for now (Firebase hookup later)
const seed: Notif[] = [
  {
    id: "1",
    type: "like",
    fromUser: "John Doe",
    fromAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60",
    message: "liked your post",
    timestampMs: Date.now() - 1000 * 60 * 30,
    read: false,
    postId: "123",
  },
  {
    id: "2",
    type: "comment",
    fromUser: "Jane Smith",
    fromAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
    message: "commented on your post",
    content: "Great achievement! Keep it up!",
    timestampMs: Date.now() - 1000 * 60 * 60 * 2,
    read: false,
    postId: "123",
  },
  {
    id: "3",
    type: "event",
    fromUser: "Starks Cricket",
    message: "You have an upcoming event tomorrow",
    content: "Cricket Tournament - Finals",
    timestampMs: Date.now() - 1000 * 60 * 60 * 5,
    read: true,
    eventId: "456",
  },
];

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notif[]>(seed);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [filter, notifications]
  );

  const markAsRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllAsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const remove = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <div className="text-xl font-extrabold tracking-tight text-slate-900">Notifications</div>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
        </div>

        {unreadCount > 0 ? (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="size-4 mr-2" />
            Mark all read
          </Button>
        ) : (
          <div className="w-[120px]" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-sm font-semibold border transition",
            filter === "all" ? "bg-slate-950 text-white border-slate-950" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-sm font-semibold border transition",
            filter === "unread" ? "bg-slate-950 text-white border-slate-950" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="text-lg font-extrabold">All caught up!</div>
            <div className="text-sm text-slate-600 mt-1">
              {filter === "unread" ? "You don't have any unread notifications." : "You don't have any notifications yet."}
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-center py-10">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Check className="size-8 text-slate-400" />
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={["cursor-pointer transition-shadow hover:shadow-md", !n.read ? "border-blue-200 bg-blue-50" : ""].join(" ")}
            >
              <CardBody>
                <div
                  className="p-4 group"
                  onClick={() => markAsRead(n.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="size-12">
                        {n.fromAvatar ? (
                          <AvatarImage src={n.fromAvatar} alt={n.fromUser} />
                        ) : (
                          <AvatarFallback>{n.fromUser.slice(0, 1).toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 size-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                        <NotifIcon type={n.type} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-extrabold">{n.fromUser}</span> {n.message}
                      </p>
                      {n.content && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          “{n.content}”
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(n.timestampMs)}</p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                        >
                          <Check className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                      >
                        <Trash2 className="size-4 text-rose-700" />
                      </Button>
                    </div>

                    {!n.read && <div className="size-2 bg-blue-600 rounded-full shrink-0 mt-2" />}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

