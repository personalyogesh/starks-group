"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import {
  requestNotificationPermission,
  saveFCMTokenToUserProfile,
} from "@/services/pushNotificationService";

interface NotificationSettingsProps {
  currentUser: any;
}

export function NotificationSettings({ currentUser }: NotificationSettingsProps) {
  const { toast } = useToast();

  const [preferences, setPreferences] = useState({
    email: true,
    push: false,
  });
  const [pushSupported, setPushSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);

  useEffect(() => {
    void loadPreferences();
    checkPushSupport();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      // TODO: Fetch preferences from Firebase using current user.
      // const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      // const prefs = userDoc.data()?.notificationPreferences;
      // setPreferences({ email: prefs?.email ?? true, push: prefs?.push ?? false });
      setPreferences({
        email: true,
        push: false,
      });
    } catch (error) {
      console.error("Failed to load preferences:", error);
      toast({
        kind: "error",
        title: "Failed to load preferences",
        description: "Please refresh and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPushSupport = () => {
    if (typeof window === "undefined") return;
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setPushSupported(supported);
  };

  const handleToggleEmail = async () => {
    setIsUpdatingEmail(true);
    const newValue = !preferences.email;
    const previous = preferences.email;

    try {
      setPreferences((prev) => ({ ...prev, email: newValue }));

      // TODO: Save to Firebase
      // await updateDoc(doc(db, "users", currentUser.uid), {
      //   "notificationPreferences.email": newValue,
      // });

      toast({
        kind: "success",
        title: `Email notifications ${newValue ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      setPreferences((prev) => ({ ...prev, email: previous }));
      console.error("Failed to update email preference:", error);
      toast({
        kind: "error",
        title: "Failed to update preference",
        description: "Please try again.",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleTogglePush = async () => {
    if (!pushSupported || !currentUser?.uid) {
      toast({
        kind: "error",
        title: "Push unavailable",
        description: "Push notifications are not supported or user is not signed in.",
      });
      return;
    }

    setIsUpdatingPush(true);
    const wasEnabled = preferences.push;

    try {
      if (!wasEnabled) {
        const token = await requestNotificationPermission();

        if (token) {
          await saveFCMTokenToUserProfile(currentUser.uid, token);
          setPreferences((prev) => ({ ...prev, push: true }));
          toast({
            kind: "success",
            title: "Push notifications enabled",
          });
        } else {
          toast({
            kind: "error",
            title: "Permission denied",
            description: "Push notification permission was not granted.",
          });
        }
      } else {
        setPreferences((prev) => ({ ...prev, push: false }));

        // TODO: Save to Firebase
        // await updateDoc(doc(db, "users", currentUser.uid), {
        //   "notificationPreferences.push": false,
        //   fcmToken: deleteField(),
        // });

        toast({
          kind: "success",
          title: "Push notifications disabled",
        });
      }
    } catch (error) {
      setPreferences((prev) => ({ ...prev, push: wasEnabled }));
      console.error("Failed to toggle push notifications:", error);
      toast({
        kind: "error",
        title: "Failed to update notifications",
        description: "Please try again.",
      });
    } finally {
      setIsUpdatingPush(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-neutral-900">Notification Preferences</h2>
      </div>

      <p className="text-neutral-600 mb-6">
        Choose how you want to receive payment requests, reminders, and refund notifications.
      </p>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Email Notifications</h3>
                <p className="text-sm text-neutral-600">Receive payment requests and updates via email</p>
              </div>
            </div>

            <label className={`relative inline-flex items-center ${isUpdatingEmail ? "cursor-wait" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={handleToggleEmail}
                disabled={isUpdatingEmail}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600 disabled:opacity-60" />
            </label>
          </div>

          <div
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
              pushSupported ? "border-neutral-200 hover:border-primary-300" : "border-neutral-100 bg-neutral-50 opacity-60"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Push Notifications</h3>
                <p className="text-sm text-neutral-600">
                  {pushSupported ? "Get instant alerts on your device" : "Not supported on this device"}
                </p>
              </div>
            </div>

            {pushSupported && (
              <label className={`relative inline-flex items-center ${isUpdatingPush ? "cursor-wait" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={preferences.push}
                  onChange={handleTogglePush}
                  disabled={isUpdatingPush}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600 disabled:opacity-60" />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">What notifications will I receive?</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Payment requests for 2026 registration</li>
          <li>• Payment reminders if pending</li>
          <li>• Refund policy information</li>
          <li>• Refund processed notifications (year-end)</li>
        </ul>
      </div>
    </div>
  );
}
