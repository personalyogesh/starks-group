export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // TODO: Replace with Firebase Cloud Messaging token retrieval.
    // Example:
    // const messaging = getMessaging(app);
    // const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
    // return token ?? null;
    return `mock-fcm-token-${Date.now()}`;
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
