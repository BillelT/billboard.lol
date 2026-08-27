"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function Experience() {
  // The billboard faces are drawn into canvases with the page font, so wait for
  // it to load rather than baking a fallback typeface into the textures.
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

  return (
    <div className="webgl" aria-hidden>
      {fontsReady && <Scene />}
    </div>
  );
}
