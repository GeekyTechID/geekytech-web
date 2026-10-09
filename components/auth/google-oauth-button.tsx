"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";
import { IS_SANDBOX } from "@/lib/app-env";

type GoogleOAuthButtonProps = {
  label: string;
  isLoading: boolean;
  onClick: () => void;
  className?: string;
};

export function GoogleOAuthButton({
  label,
  isLoading,
  onClick,
  className = "-mt-4 w-full",
}: GoogleOAuthButtonProps) {
  // Provider Google dimatikan di db_sandbox (secret OAuth hanya di production).
  if (IS_SANDBOX) return null;
  return (
    <Button
      type="button"
      variant="dark"
      onClick={onClick}
      loading={isLoading}
      className={className}
    >
      {!isLoading ? <GoogleIcon data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
