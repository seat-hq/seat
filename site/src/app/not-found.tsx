import type { Metadata } from "next";
import { LinkButton } from "@/components/LinkButton";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="sec" style={{ minHeight: "80vh", display: "grid", alignItems: "center" }}>
      <div className="wrap" style={{ display: "grid", gap: "1.5rem", justifyItems: "start" }}>
        <p className="eyebrow">404</p>
        <h1 className="display h-xl">
          Nothing in <em>this pile.</em>
        </h1>
        <p className="lede">The page you asked for does not exist — or has not been published yet.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <LinkButton href="/" variant="primary">
            Back to the story
          </LinkButton>
          <LinkButton to="docs">Read the docs</LinkButton>
        </div>
      </div>
    </section>
  );
}
