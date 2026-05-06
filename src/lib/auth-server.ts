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

export async function getRubberSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rubber_token")?.value;
  return token || null;
}

export async function getProviderSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("provider_token")?.value;
  return token || null;
}
