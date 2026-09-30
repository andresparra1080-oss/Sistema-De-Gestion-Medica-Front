export default function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  const variants = {
    primary: 'bg-primary text-slate-950 hover:opacity-90',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700',
    danger: 'bg-red-500 text-white hover:bg-red-400',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
