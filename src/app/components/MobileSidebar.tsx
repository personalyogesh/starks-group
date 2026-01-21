"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import Button from "@/components/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import {
  Award,
  Bell,
  Bookmark,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Menu,
  Phone,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  Video,
  Heart,
} from "lucide-react";

type Props = {
  isAuthenticated: boolean;
  userProfile?: {
    displayName?: string;
    email?: string;
    photoURL?: string;
    role?: string;
    postsCount?: number;
    likesReceived?: number;
    eventsJoined?: number;
    unreadNotifications?: number;
  };
  onNavigate: (page: string) => void;
  onLogout: () => void;
};

function initials(name?: string) {
  const n = (name ?? "U").trim();
  return n.slice(0, 1).toUpperCase();
}

function MenuItem({
  icon: Icon,
  label,
  badge,
  onClick,
  iconColor = "text-slate-700",
  bgColor = "hover:bg-slate-50",
}: {
  icon: any;
  label: string;
  badge?: string | number | null;
  onClick: () => void;
  iconColor?: string;
  bgColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group",
        bgColor,
      ].join(" ")}
    >
      <div className="size-9 bg-slate-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon className={["size-5", iconColor].join(" ")} />
      </div>
      <span className="flex-1 text-left font-semibold text-slate-800">{label}</span>
      {badge != null && badge !== "" && (
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      )}
      <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

export function MobileSidebar({ isAuthenticated, userProfile, onNavigate, onLogout }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const roleIsAdmin = String(userProfile?.role ?? "").toLowerCase().includes("admin");
  const unread = userProfile?.unreadNotifications ?? 0;

  const displayName = useMemo(() => {
    return (userProfile?.displayName ?? "Member").trim();
  }, [userProfile?.displayName]);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="lg:hidden relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-6 text-slate-800 dark:text-slate-100" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[320] lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-xl border-r border-slate-200 flex flex-col dark:bg-slate-950 dark:border-slate-800">
            {/* Header */}
            {isAuthenticated && userProfile ? (
              <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="flex items-start gap-4">
                  <button type="button" onClick={() => handleNavigate("profile")} className="shrink-0">
                    <Avatar className="size-16 ring-4 ring-white/20">
                      {userProfile.photoURL ? (
                        <AvatarImage src={userProfile.photoURL} alt={displayName} />
                      ) : (
                        <AvatarFallback className="bg-white text-blue-700 text-xl">{initials(displayName)}</AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-lg truncate">{displayName}</div>
                    <div className="text-xs text-blue-100 truncate">{userProfile.email ?? ""}</div>
                    <Badge variant={roleIsAdmin ? "secondary" : "default"} className="mt-2 text-xs bg-white/15 border-white/20 text-white">
                      {roleIsAdmin ? "👑 Admin" : "⭐ Member"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="font-extrabold text-lg">{userProfile.postsCount ?? 0}</div>
                    <div className="text-xs text-blue-100">Posts</div>
                  </div>
                  <div className="text-center p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="font-extrabold text-lg">{userProfile.likesReceived ?? 0}</div>
                    <div className="text-xs text-blue-100">Likes</div>
                  </div>
                  <div className="text-center p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="font-extrabold text-lg">{userProfile.eventsJoined ?? 0}</div>
                    <div className="text-xs text-blue-100">Events</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="text-center">
                  <div className="size-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="size-8 text-white" />
                  </div>
                  <div className="font-extrabold text-lg mb-2">Welcome to Starks Cricket</div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleNavigate("login")}>
                      Login
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-white border-white/70 hover:bg-white/10"
                      onClick={() => handleNavigate("register")}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Menu */}
            <div className="py-4 overflow-y-auto flex-1">
              <div className="px-3 pb-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 mb-2">Explore</div>
                <div className="space-y-1">
                  <MenuItem icon={Home} label="Community Feed" onClick={() => handleNavigate("dashboard")} iconColor="text-blue-600" bgColor="hover:bg-blue-50" />
                  <MenuItem icon={Users} label="Members" onClick={() => handleNavigate("members")} iconColor="text-purple-600" bgColor="hover:bg-purple-50" />
                  <MenuItem icon={Calendar} label="Events" onClick={() => handleNavigate("events")} iconColor="text-green-600" bgColor="hover:bg-green-50" />
                  <MenuItem icon={Video} label="Videos & Media" onClick={() => handleNavigate("videos")} iconColor="text-red-600" bgColor="hover:bg-red-50" />
                  <MenuItem icon={Award} label="Partners" onClick={() => handleNavigate("partners")} iconColor="text-amber-600" bgColor="hover:bg-amber-50" />
                  {isAuthenticated && (
                    <MenuItem icon={DollarSign} label="Payments" onClick={() => handleNavigate("payments")} iconColor="text-emerald-600" bgColor="hover:bg-emerald-50" />
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              {isAuthenticated && (
                <>
                  <div className="px-3 pb-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 mb-2">Your Activity</div>
                    <div className="space-y-1">
                      <MenuItem icon={User} label="Your Profile" onClick={() => handleNavigate("profile")} iconColor="text-indigo-600" bgColor="hover:bg-indigo-50" />
                      <MenuItem icon={Heart} label="Liked Posts" onClick={() => handleNavigate("liked")} iconColor="text-pink-600" bgColor="hover:bg-pink-50" />
                      <MenuItem icon={Bookmark} label="Saved" onClick={() => handleNavigate("saved")} iconColor="text-yellow-600" bgColor="hover:bg-yellow-50" />
                      <MenuItem icon={Clock} label="Activity History" onClick={() => handleNavigate("history")} iconColor="text-slate-600" bgColor="hover:bg-slate-50" />
                    </div>
                  </div>
                  <Separator className="my-3" />
                </>
              )}

              <div className="px-3 pb-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 mb-2">Settings & Support</div>
                <div className="space-y-1">
                  {isAuthenticated && (
                    <>
                      <MenuItem
                        icon={Bell}
                        label="Notifications"
                        badge={unread > 0 ? unread : null}
                        onClick={() => handleNavigate("notifications")}
                        iconColor="text-blue-600"
                        bgColor="hover:bg-blue-50"
                      />
                      <MenuItem icon={Settings} label="Settings & Privacy" onClick={() => handleNavigate("settings")} iconColor="text-slate-600" bgColor="hover:bg-slate-50" />
                    </>
                  )}
                  <MenuItem icon={HelpCircle} label="Help & Support" onClick={() => handleNavigate("help")} iconColor="text-teal-600" bgColor="hover:bg-teal-50" />
                  <MenuItem icon={Info} label="About Us" onClick={() => handleNavigate("about")} iconColor="text-sky-600" bgColor="hover:bg-sky-50" />
                  <MenuItem icon={Phone} label="Contact" onClick={() => handleNavigate("contact")} iconColor="text-violet-600" bgColor="hover:bg-violet-50" />
                </div>
              </div>

              {isAuthenticated && roleIsAdmin && (
                <>
                  <Separator className="my-3" />
                  <div className="px-3 pb-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 mb-2 flex items-center gap-1">
                      <Shield className="size-3" />
                      Admin Tools
                    </div>
                    <div className="space-y-1">
                      <MenuItem icon={Shield} label="Admin Dashboard" onClick={() => handleNavigate("admin")} iconColor="text-orange-600" bgColor="hover:bg-orange-50" />
                      <MenuItem icon={TrendingUp} label="Analytics" onClick={() => handleNavigate("analytics")} iconColor="text-emerald-600" bgColor="hover:bg-emerald-50" />
                    </div>
                  </div>
                </>
              )}

              {isAuthenticated && (
                <>
                  <Separator className="my-3" />
                  <div className="px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="size-5" />
                      <span className="font-semibold">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-slate-50">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>© 2026 Starks Cricket</span>
                <span>•</span>
                <span>v1.0.0</span>
              </div>
              <div className="flex justify-center gap-3 mt-2">
                <a href="/privacy" className="text-xs text-slate-500 hover:text-blue-700">
                  Privacy
                </a>
                <a href="/terms" className="text-xs text-slate-500 hover:text-blue-700">
                  Terms
                </a>
                <a href="/#about" className="text-xs text-slate-500 hover:text-blue-700">
                  Help
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

