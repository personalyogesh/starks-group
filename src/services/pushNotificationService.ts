export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Production-safe behavior: do not return mock tokens.
    // Return null until FCM is fully wired.
    return null;
  } catch (error) {
    console.error("[pushNotificationService] Permission request failed:", error);
    return null;
  }
}

export async function saveFCMTokenToUserProfile(userId: string, token: string): Promise<void> {
  // TODO: Persist token to Firebase user profile.
  // Example:
  // await updateDoc(doc(db, "users", userId), {
  //   fcmToken: token,
  //   "notificationPreferences.push": true,
  //   updatedAt: serverTimestamp(),
  // });
  console.log("[pushNotificationService] save token", { userId, token });
}
