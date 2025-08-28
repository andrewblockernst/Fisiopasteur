interface PatronFondoProps {
  children: React.ReactNode;
  className?: string;
}

export default function PatronFondo({ children, className = "" }: PatronFondoProps) {
  return (
    <div className={`min-h-screen w-full bg-white relative ${className}`}>
      {/* Noise Texture (Darker Dots) Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#ffffff",
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
          backgroundSize: "50px 50px",
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}