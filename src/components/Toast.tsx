interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#10b981',
        color: '#fff',
        borderRadius: 10,
        padding: '9px 20px',
        fontSize: 13,
        fontWeight: 700,
        zIndex: 999,
        boxShadow: '0 4px 24px rgba(0,0,0,.5)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        animation: 'fadeIn .2s ease',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateX(-50%) translateY(-6px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
      {message}
    </div>
  )
}
