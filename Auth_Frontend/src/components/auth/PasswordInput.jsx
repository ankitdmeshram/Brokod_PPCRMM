import { useState } from "react";

import { IconButton, Input } from "@mui/joy";

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      endDecorator={
        <IconButton
          aria-label={visible ? "Hide password" : "Show password"}
          variant="plain"
          color="neutral"
          onClick={() => setVisible((current) => !current)}
          sx={{ color: "#667085" }}
        >
          {visible ? "Hide" : "Show"}
        </IconButton>
      }
    />
  );
}
