"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nightAudio } from "@/lib/nightAudio";

const Night404Scene = dynamic(() => import("./Night404Scene"), { ssr: false });

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg className="gauge__soundIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function Night404Experience() {
  // Same gate Experience.tsx uses: the billboard face is drawn into a canvas
  // with the page font, so wait for it instead of baking in a fallback.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const done = () => !cancelled && setFontsReady(true);
    document.fonts?.ready.then(done) ?? done();
    const bail = setTimeout(done, 1500);
    return () => {
      cancelled = true;
      clearTimeout(bail);
    };
  }, []);

  const [sound, setSound] = useState(false);
  useEffect(() => {
    const off = nightAudio.subscribe(setSound);
    const disarm = nightAudio.armFromPreference();
    setSound(nightAudio.enabled);
    return () => {
      off();
      disarm();
    };
  }, []);

  return (
    <main className="night404">
      <div className="night404__canvas" aria-hidden>
        {fontsReady && <Night404Scene />}
      </div>

      {/* real, accessible way back — the billboard itself is the main event */}
      <header className="masthead">
        <Link href="/" className="wordmark">
          <span className="wordmark__sign" aria-hidden="true" />
          bidboard<em>.lol</em>
        </Link>
      </header>

      <div className="night404__soundDock">
        <button
          type="button"
          className="night404__soundBtn"
          onClick={() => nightAudio.toggle()}
          aria-pressed={sound}
          title={sound ? "Silence the night" : "Hear the night"}
        >
          Sound {sound ? "on" : "off"}
          <SoundIcon muted={!sound} />
        </button>
      </div>
    </main>
  );
}
