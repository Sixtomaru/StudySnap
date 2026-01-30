import React, { useEffect } from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success', size?: 'sm' | 'md' }> = ({ 
  children, className = '', variant = 'primary', size = 'md', ...props 
}) => {
  const baseStyle = "font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl"
  };

  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 border border-transparent",
    secondary: "bg-white text-slate-700 border-2 border-slate-200 hover:border-brand-500 hover:text-brand-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400",
    success: "bg-green-600 text-white hover:bg-green-700 border border-transparent shadow-md shadow-green-500/20",
    ghost: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 border border-transparent"
  };

  return (
    <button className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: (e: any) => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-all duration-300' : ''} ${className}`}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all ${className}`} {...props} />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none ${className}`} {...props} />
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    // Corregido: azul más oscuro en dark mode para no deslumbrar
    blue: "bg-blue-50 text-brand-600 dark:bg-slate-700 dark:text-brand-400 dark:border dark:border-slate-600",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  };
  return <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${colors[color]}`}>{children}</span>;
};

export const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: "bg-slate-800 dark:bg-white text-white dark:text-slate-900",
    error: "bg-red-500 text-white",
    info: "bg-brand-500 text-white"
  };

  return (
    <div className={`fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColors[type]}`}>
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
};