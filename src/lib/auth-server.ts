import { cookies } from "next/headers";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token || null;
}

export async function getStoreSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("store_token")?.value;
  return token || null;
}

export async function getRiderSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rider_token")?.value;
  return token || null;
}
