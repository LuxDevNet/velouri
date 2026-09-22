// Home.tsx — cinematic 2.5D entry point. Six depth layers, a split-converge
// headline that resolves word by word with a lighting sweep, and pointer
// parallax on the ambient layers. No WebGL here — that is /velouri only.

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { Viewfinder } from "../components/Viewfinder";
import { motionEnabled } from "../lib/motion";
import { useDepthParallax } from "../lib/useDepthParallax";

const HEADLINE = "A federated stock search, staged.";

export default function Home() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useDepthParallax(sceneRef);

  useEffect(() => {
    if (!motionEnabled() || !headlineRef.current) return;
    const words = gsap.utils.toArray<HTMLElement>(".word", headlineRef.current);
    gsap.set(words, {
      opacity: 0,
      x: () => gsap.utils.random(-70, 70),
      y: () => gsap.utils.random(-50, 50),
      filter: "brightness(0.35)",
    });
    gsap.to(words, {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "brightness(1)",
      duration: 1,
      ease: "power3.out",
      stagger: 0.09,
    });
  }, []);

  return (
    <div className="scene home-scene" ref={sceneRef}>
      <Viewfinder label="AGNA // HOME" />
      <div className="depth-layer" data-depth="1" aria-hidden="true" />
      <div className="depth-layer" data-depth="2" aria-hidden="true" />
      <div className="depth-layer" data-depth="3" aria-hidden="true" />
      <div className="depth-layer" data-depth="4" aria-hidden="true" />
      <div className="depth-layer" data-depth="5" aria-hidden="true" />
      <div className="hero" data-depth="6">
        <p className="eyebrow">Federated gallery API</p>
        <h1 ref={headlineRef} className="headline">
          {HEADLINE.split(" ").map((word, index) => (
            <span className="word" key={`${word}-${index}`}>
              {word}&nbsp;
            </span>
          ))}
        </h1>
        <p className="lede">
          Agna searches Unsplash, Pexels, Openverse, and Wikimedia Commons through one reshape
          pipeline, caches what comes back, and hands it to Velouri — a companion stage that
          renders the same gallery in three dimensions.
        </p>
        <div className="hero-actions">
          <a className="btn-primary" href="/velouri">
            Open Velouri
          </a>
          <a className="btn-ghost" href="/docs">
            Read the API
          </a>
        </div>
      </div>
    </div>
  );
}
