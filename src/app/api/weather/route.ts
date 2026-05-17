import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/weather?lat=16.4419&lon=102.8360
 * Returns current weather data from Open-Meteo (free, no API key)
 * Default: Khon Kaen, Thailand
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") || "16.4419";
    const lon = searchParams.get("lon") || "102.8360";

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Asia%2FBangkok&forecast_days=3`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
    }

    const data = await res.json();

    // Map WMO weather codes to Thai descriptions + icons
    const weatherMap: Record<number, { desc: string; icon: string; tip: string }> = {
      0: { desc: "ท้องฟ้าแจ่มใส", icon: "☀️", tip: "อากาศดี เหมาะซักผ้า!" },
      1: { desc: "ท้องฟ้าค่อนข้างแจ่มใส", icon: "🌤️", tip: "อากาศดี เหมาะซักผ้า!" },
      2: { desc: "มีเมฆบางส่วน", icon: "⛅", tip: "อากาศพอใช้ได้" },
      3: { desc: "มีเมฆมาก", icon: "☁️", tip: "อาจมีฝน ระวังผ้าเปียก" },
      45: { desc: "หมอกลง", icon: "🌫️", tip: "ทัศนวิสัยต่ำ ขับระวัง" },
      48: { desc: "หมอกหนา", icon: "🌫️", tip: "ทัศนวิสัยต่ำมาก ขับระวัง" },
      51: { desc: "ฝนปรอยเบา", icon: "🌦️", tip: "ฝนเบา ๆ ระวังถนนลื่น" },
      53: { desc: "ฝนปรอยปานกลาง", icon: "🌦️", tip: "พกร่ม ระวังผ้าเปียก" },
      55: { desc: "ฝนปรอยหนัก", icon: "🌧️", tip: "ฝนตก ระวังถนนลื่น" },
      61: { desc: "ฝนตกเบา", icon: "🌧️", tip: "ฝนตก ระวังถนนลื่น" },
      63: { desc: "ฝนตกปานกลาง", icon: "🌧️", tip: "ฝนตกหนัก ระวังน้ำท่วม" },
      65: { desc: "ฝนตกหนัก", icon: "⛈️", tip: "ฝนตกหนักมาก หลีกเลี่ยงเดินทาง" },
      80: { desc: "ฝนตกเป็นช่วง ๆ", icon: "🌦️", tip: "ฝนตก ๆ หยุด ๆ ระวังถนนลื่น" },
      81: { desc: "ฝนตกเป็นช่วงปานกลาง", icon: "🌧️", tip: "ระวังถนนลื่น" },
      82: { desc: "ฝนตกเป็นช่วงหนัก", icon: "⛈️", tip: "ฝนหนักมาก ระวัง!" },
      95: { desc: "พายุฝนฟ้าคะนอง", icon: "⛈️", tip: "อันตราย! หลีกเลี่ยงเดินทาง" },
      96: { desc: "พายุฝนฟ้าคะนอง + ลูกเห็บ", icon: "🌩️", tip: "อันตรายมาก! อยู่ในที่ปลอดภัย" },
      99: { desc: "พายุรุนแรง + ลูกเห็บ", icon: "🌩️", tip: "อันตรายมาก! อยู่ในที่ปลอดภัย" },
    };

    const currentCode = data.current?.weather_code ?? 0;
    const weather = weatherMap[currentCode] || { desc: "ไม่ทราบสภาพอากาศ", icon: "🌡️", tip: "" };

    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(currentCode);

    return NextResponse.json({
      current: {
        temp: Math.round(data.current?.temperature_2m ?? 0),
        feelsLike: Math.round(data.current?.apparent_temperature ?? 0),
        humidity: data.current?.relative_humidity_2m ?? 0,
        rain: data.current?.rain ?? 0,
        windSpeed: Math.round(data.current?.wind_speed_10m ?? 0),
        code: currentCode,
        ...weather,
        isRainy,
      },
      forecast: (data.daily?.time || []).map((date: string, i: number) => ({
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        rain: data.daily.precipitation_sum[i],
        ...(weatherMap[data.daily.weather_code[i]] || { desc: "-", icon: "🌡️", tip: "" }),
      })),
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Weather unavailable" }, { status: 500 });
  }
}
