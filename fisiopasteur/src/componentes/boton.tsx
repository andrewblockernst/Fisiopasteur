import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "success";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-brand before:bg-brand hover:bg-brand-hover",
  secondary: "border-slate-600 before:bg-slate-700 hover:bg-slate-600",
  danger: "border-destructive before:bg-destructive hover:bg-red-500",
  warning: "border-warning before:bg-warning hover:bg-amber-500",
  success: "border-success before:bg-success hover:bg-green-500",
};

interface ButtonProps {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const baseClasses =
  "relative px-8 py-2 rounded-md bg-white isolation-auto z-10 border-2 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full hover:text-white before:-right-full before:hover:right-0 before:rounded-full before:-z-10 before:aspect-square before:hover:scale-150 overflow-hidden inline-flex items-center justify-center text-sm font-semibold text-black shadow-sm gap-x-2 disabled:opacity-50 disabled:pointer-events-none";

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  disabled = false,
  onClick,
  type = "button",
}) => {
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
