"use client";

import { useEffect, useState } from "react";

export default function TTSPage() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_KEY = "sk_8f75ad145b0858db41f25cd5e00b3e986582118266900333"; // Replace with your ElevenLabs API Key

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": API_KEY,
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch voices", await res.text());
          return;
        }

        const data = await res.json();
        setVoices(data.voices);
        setSelectedVoice(data.voices[0]?.voice_id);
      } catch (error) {
        console.error("Error fetching voices:", error);
      }
    };

    fetchVoices();
  }, []);

  const generateSpeech = async (text: string) => {
  if (!selectedVoice) {
    alert("No voice selected!");
    return;
  }

  try {
    setIsLoading(true);

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: selectedVoice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTS error:", errorText);
      alert(`TTS Error: ${response.status}`);
      setIsLoading(false);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();

    setIsLoading(false);
  } catch (err) {
    console.error("Frontend error:", err);
    alert("Something went wrong while generating speech.");
    setIsLoading(false);
  }
};

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex items-center justify-center px-4 font-sans">
      <div className="backdrop-blur-lg bg-white/5 border border-white/10 shadow-2xl rounded-2xl p-10 w-full max-w-xl transition-all duration-300">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-white drop-shadow-sm">
          Text-to-Speech Testing
        </h1>

        <h2 className="text-xl font-semibold mb-4 text-white/80">Generate Speech</h2>

        <label className="block text-sm mb-1 text-white/60">Voice Selection</label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full p-2 rounded-lg bg-[#1f1f1f] text-white border border-white/20 mb-4 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          {voices.map((voice) => (
            <option
              key={voice.voice_id}
              value={voice.voice_id}
              className="bg-[#1f1f1f] text-white"
            >
              {voice.name} ({voice.labels?.accent || "Neutral"})
            </option>
          ))}
        </select>

        <label className="block text-sm mb-1 text-white/60">Speech Speed</label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          defaultValue="1"
          className="w-full mb-1 accent-white"
        />
        <p className="text-sm text-center mb-4 text-white/40">1.0x</p>

        <label className="block text-sm mb-1 text-white/60">Text Input</label>
        <textarea
          className="w-full h-28 p-3 rounded-lg bg-white/10 text-white border border-white/20 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 placeholder:text-white/40"
          placeholder="Enter text to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>

        <button
          onClick={() => generateSpeech(text)}
          disabled={!text || isLoading}
          className={`w-full py-2 rounded-lg font-semibold tracking-wide transition duration-300 ${
            !text || isLoading
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-white to-zinc-300 text-black hover:from-zinc-200 hover:to-white shadow-lg hover:scale-[1.01]"
          }`}
        >
          {isLoading ? "Generating..." : "Generate Speech"}
        </button>
      </div>
    </div>
  );
}