import { ButtonProps } from "@/lib/types";

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "px-3 py-1.5 text-sm rounded",
    md: "px-4 py-2 text-base rounded-md",
    lg: "px-6 py-3 text-lg rounded-lg",
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-accent text-panel",
    secondary: "bg-panel text-accent border border-accent",
    ghost: "bg-transparent text-accent hover:bg-accent/10",
};

export default function Button(
    { variant, size, onClick, children, disabled }: ButtonProps
) {
    const base = "font-medium transition-colors diabled:bg-disabled disabled:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
    const className = [base, variantClasses[variant], sizeClasses[size]].join(" ");
    return (
        <button className={className} onClick={onClick} disabled={disabled}>
            {children}
        </button>
    );
}