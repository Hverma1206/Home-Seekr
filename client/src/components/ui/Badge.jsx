const Badge = ({ children, variant = 'light', className = "" }) => {
  const styles = {
    light: "bg-white/80 backdrop-blur-md text-slate-900",
    dark: "bg-slate-900 text-white",
    accent: "bg-emerald-500 text-white"
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
