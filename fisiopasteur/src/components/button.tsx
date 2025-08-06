import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "success";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-[#9C1838] before:bg-[#9C1838] hover:bg-[#bb3556]",
  secondary: "border-slate-600 before:bg-slate-700 hover:bg-slate-600",
  danger: "border-red-600 before:bg-red-700 hover:bg-red-600",
  warning: "border-yellow-600 before:bg-yellow-700 hover:bg-yellow-600",
  success: "border-green-600 before:bg-green-700 hover:bg-green-600",
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
