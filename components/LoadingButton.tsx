import type React from "react";

export function LoadingButton({
  loading,
  loadingText,
  children,
  className = "primary-button",
  disabled,
  type = "button",
  onClick
}: {
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button className={className} disabled={disabled || loading} onClick={onClick} type={type} aria-busy={loading}>
      {loading ? (
        <>
          <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </>
      ) : children}
    </button>
  );
}
