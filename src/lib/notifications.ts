"use client";

/**
 * Play a notification sound ("Ting!")
 */
export function playNotificationSound() {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(err => console.warn("Audio playback blocked by browser:", err));
  } catch (err) {
    console.error("Failed to play notification sound:", err);
  }
}

/**
 * Web Push Subscription Helper
 */
export async function subscribeToPush(publicVapidKey: string) {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  
  // Check if already subscribed
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) return existingSubscription;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
