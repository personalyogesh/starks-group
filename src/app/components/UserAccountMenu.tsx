"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
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
  Edit2,
  PlusCircle,
  ChevronDown,
  Shield,
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
}

export function UserAccountMenu({
  user,
  onNavigate,
  onLogout,
  notificationCount = 0,
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
              <span className="hidden sm:inline font-medium">{getDisplayName(user.name)}</span>
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
          <DropdownMenuContent className="w-64" align="end">
            {/* User Info Header */}
            <div className="px-3 py-3 bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : (
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Profile Actions */}
            <DropdownMenuItem onClick={() => onNavigate("profile")}>
              <User className="size-4 mr-3" />
              <span>View Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onNavigate("edit-profile")}>
              <Edit2 className="size-4 mr-3" />
              <span>Edit Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onNavigate("create-post")}>
              <PlusCircle className="size-4 mr-3" />
              <span>Create Post</span>
            </DropdownMenuItem>

            {String(user.role ?? "").toLowerCase().includes("admin") && (
              <DropdownMenuItem onClick={() => onNavigate("admin")}>
                <Shield className="size-4 mr-3" />
                <span>Admin Dashboard</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Settings & Support */}
            <DropdownMenuItem onClick={() => onNavigate("settings")}>
              <Settings className="size-4 mr-3" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onNavigate("notifications")}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Bell className="size-4 mr-3" />
                  <span>Notifications</span>
                </div>
                {notificationCount && notificationCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onNavigate("help")}>
              <HelpCircle className="size-4 mr-3" />
              <span>Help & Support</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={() => setShowLogoutDialog(true)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="size-4 mr-3" />
              <span>Logout</span>
            </DropdownMenuItem>
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

