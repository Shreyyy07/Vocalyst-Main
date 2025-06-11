import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voice_id } = await req.json();

    if (!text || !voice_id) {
      console.log("❌ Missing input:", { text, voice_id });
      return NextResponse.json({ error: "Missing text or voice ID" }, { status: 400 });
    }

    const apiKey = process.env.ELEVEN_API_KEY;

    if (!apiKey) {
      console.error("❌ ELEVEN_API_KEY is missing in .env.local");
      return NextResponse.json({ error: "Missing ElevenLabs API Key" }, { status: 500 });
    }

    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!elevenResponse.ok) {
      const error = await elevenResponse.text();
      console.error("❌ ElevenLabs Error:", error);
      return NextResponse.json({ error }, { status: elevenResponse.status });
    }

    const buffer = await elevenResponse.arrayBuffer();

    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}