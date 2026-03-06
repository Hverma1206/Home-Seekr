import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className = "", onClick, icon }) => {
  const baseStyle = "px-6 py-3.5 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20",
    accent: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:border-slate-900",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
      {icon && <span className="ml-1">{icon}</span>}
    </motion.button>
  );
};

export default Button;
