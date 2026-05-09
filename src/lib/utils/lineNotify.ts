export async function sendLineNotify(message: string, token?: string) {
  try {
    // If token is not provided as an argument, try to get it from process.env
    // (Note: In Cloudflare Edge Runtime, process.env might not be fully populated
    // depending on how bindings are set up, so passing token directly is safer)
    const notifyToken = token || process.env.LINE_ADMIN_NOTIFY_TOKEN;

    if (!notifyToken) {
      console.warn("sendLineNotify: Missing LINE Notify Token. Cannot send message.");
      return false;
    }

    const formData = new URLSearchParams();
    formData.append("message", message);

    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${notifyToken}`,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LINE Notify failed: ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("sendLineNotify error:", error);
    return false;
  }
}
