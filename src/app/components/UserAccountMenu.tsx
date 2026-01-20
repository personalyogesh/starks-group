"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import {
  User,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  PlusCircle,
  ChevronDown,
  Shield,
  Edit2,
} from "lucide-react";

export interface UserAccountMenuProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onNavigate: (page: string) => void;
  onLogout: () => void;
  notificationCount?: number;
  showNameInTrigger?: boolean;
  stats?: { posts?: number; likes?: number; events?: number };
}

export function UserAccountMenu({
  user,
  onNavigate,
  onLogout,
  notificationCount = 0,
  showNameInTrigger = true,
  stats,
}: UserAccountMenuProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const getInitials = (name: string) => {
    const names = (name ?? "").trim().split(" ").filter(Boolean);
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return (name ?? "U").substring(0, 2).toUpperCase();
  };

  const getDisplayName = (name: string) => {
    const firstName = (name ?? "").trim().split(" ")[0] || "Account";
    return firstName.length > 12 ? `${firstName.substring(0, 12)}...` : firstName;
  };

  const roleIsAdmin = String(user.role ?? "").toLowerCase().includes("admin");
  const postsCount = stats?.posts ?? 0;
  const likesCount = stats?.likes ?? 0;
  const eventsCount = stats?.events ?? 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Button variant="outline" className="flex items-center gap-2 hover:bg-gray-100">
              <Avatar className="size-8">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : (
                  <AvatarFallback className="text-sm">{getInitials(user.name)}</AvatarFallback>
                )}
              </Avatar>
              {/* Tablet+ shows name, mobile shows avatar only */}
              {showNameInTrigger && <span className="hidden sm:inline font-medium">{getDisplayName(user.name)}</span>}
              <ChevronDown className="size-4 text-gray-500" />
            </Button>
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold ring-2 ring-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </div>
        </DropdownMenuTrigger>

        <div className="relative">
          <DropdownMenuContent align="end" className="w-72">
            {/* User Info Section */}
            <div className="px-4 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-start gap-3">
                <Avatar className="size-14 ring-2 ring-white shadow-md">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">
                      {getInitials(user.name).slice(0, 1)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-lg truncate">{user.name}</p>
                  <p className="text-xs text-slate-600 truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={roleIsAdmin ? "default" : "secondary"} className="text-xs">
                      {roleIsAdmin ? "👑 Admin" : "⭐ Member"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate("profile")}
                      className="h-6 text-xs px-2 bg-white/80 hover:bg-white"
                    >
                      View Profile →
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-4 py-3 border-b bg-slate-50">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="cursor-pointer hover:bg-white p-2 rounded transition-colors">
                  <div className="text-lg font-extrabold text-blue-700">{postsCount}</div>
                  <div className="text-xs text-slate-500">Posts</div>
                </div>
                <div className="cursor-pointer hover:bg-white p-2 rounded transition-colors">
                  <div className="text-lg font-extrabold text-rose-700">{likesCount}</div>
                  <div className="text-xs text-slate-500">Likes</div>
                </div>
                <div className="cursor-pointer hover:bg-white p-2 rounded transition-colors">
                  <div className="text-lg font-extrabold text-emerald-700">{eventsCount}</div>
                  <div className="text-xs text-slate-500">Events</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Actions</div>
              <DropdownMenuItem
                onClick={() => onNavigate("create-post")}
                className="mx-2 rounded-md hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
              >
                <div className="size-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <PlusCircle className="size-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Create Post</div>
                  <div className="text-xs text-slate-500">Share with community</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onNavigate("edit-profile")}
                className="mx-2 rounded-md hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
              >
                <div className="size-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Edit2 className="size-4 text-purple-700" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Edit Profile</div>
                  <div className="text-xs text-slate-500">Update your information</div>
                </div>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            {/* Account Settings */}
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</div>
              <DropdownMenuItem className="mx-2 rounded-md cursor-pointer" onClick={() => onNavigate("settings")}>
                <Settings className="size-4 mr-3 text-slate-600" />
                <span>Settings & Privacy</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="mx-2 rounded-md cursor-pointer relative" onClick={() => onNavigate("notifications")}>
                <Bell className="size-4 mr-3 text-slate-600" />
                <span>Notifications</span>
                {(notificationCount || 0) > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Badge>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem className="mx-2 rounded-md cursor-pointer" onClick={() => onNavigate("help")}>
                <HelpCircle className="size-4 mr-3 text-slate-600" />
                <span>Help & Support</span>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            {/* Admin Section (if admin) */}
            {roleIsAdmin && (
              <>
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Shield className="size-3" />
                    Admin Tools
                  </div>
                  <DropdownMenuItem
                    onClick={() => onNavigate("admin")}
                    className="mx-2 rounded-md hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                  >
                    <div className="size-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="size-4 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">Admin Dashboard</div>
                      <div className="text-xs text-slate-500">Manage users & content</div>
                    </div>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Logout */}
            <div className="py-2">
              <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                className="mx-2 rounded-md text-rose-700 hover:bg-rose-50 hover:text-rose-800 cursor-pointer font-semibold"
              >
                <LogOut className="size-4 mr-3" />
                Logout
              </DropdownMenuItem>
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 border-t bg-slate-50">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Starks Cricket Club</span>
                <span>v1.0.0</span>
              </div>
            </div>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={() => {
          setShowLogoutDialog(false);
          onLogout();
        }}
      />
    </>
  );
}

