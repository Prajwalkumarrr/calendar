// This route is rewritten to /landing.html via next.config.mjs.
// This file exists only as a fallback if the rewrite is disabled.
export default function Home() {
  return (
    <main style={{ padding: 48, fontFamily: 'Geist, sans-serif' }}>
      <h1>ElevAIte Calendar</h1>
      <p>If you can see this, the landing rewrite is not active. Visit /landing.html directly.</p>
    </main>
  );
}
