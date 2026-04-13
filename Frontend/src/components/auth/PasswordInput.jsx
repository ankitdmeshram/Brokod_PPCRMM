import { useMemo, useState } from "react";
import { IconButton, Input } from "@mui/joy";

function EyeIcon(props) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      {...props}
    >
      <path
        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      {...props}
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M10.58 10.58A2 2 0 0 0 13.42 13.42"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.712 6.722A10.457 10.457 0 0 0 2.458 12C3.732 16.057 7.523 19 12 19c1.756 0 3.407-.454 4.842-1.251"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.88 5.298A10.56 10.56 0 0 1 12 5c4.477 0 8.268 2.943 9.542 7a10.523 10.523 0 0 1-2.304 3.95"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function PasswordInput({ placeholder, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = useMemo(
    () => (showPassword ? "text" : "password"),
    [showPassword],
  );

  return (
    <Input
      placeholder={placeholder}
      type={passwordType}
      {...props}
      endDecorator={
        <IconButton
          variant="plain"
          color="neutral"
          onClick={() => setShowPassword((value) => !value)}
          sx={{ color: "#667085" }}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </IconButton>
      }
    />
  );
}
