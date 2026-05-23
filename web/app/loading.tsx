export default function Loading() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 3,
      background: 'linear-gradient(90deg, #D97757 0%, #E8A882 50%, #D97757 100%)',
      backgroundSize: '200% 100%',
      animation: 'nav-progress 1.2s ease infinite',
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes nav-progress {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
