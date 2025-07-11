import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "success";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-blue-700 before:bg-blue-700 hover:bg-blue-50",
  secondary: "border-gray-700 before:bg-gray-700 hover:bg-gray-50",
  danger: "border-red-700 before:bg-[#A12347] hover:bg-red-50",
  warning: "border-yellow-700 before:bg-yellow-500 hover:bg-yellow-50",
  success: "border-green-700 before:bg-green-700 hover:bg-green-50",
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
