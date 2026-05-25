export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }}
        />
        <div className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          Memuat...
        </div>
      </div>
    </div>
  );
}
