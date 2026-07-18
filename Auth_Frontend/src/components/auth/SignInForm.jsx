import { Button, Checkbox, FormControl, FormLabel, Input, Stack } from "@mui/joy";
import { useAuthContext } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import { fieldLabelStyles, primaryButtonStyles } from "./auth.styles";

export default function SignInForm() {
  const { signInValues, signInLoading, updateSignInField, submitSignIn } =
    useAuthContext();

  return (
    <Stack
      spacing={2.25}
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void submitSignIn();
      }}
    >
      <FormControl>
        <FormLabel sx={fieldLabelStyles}>Email</FormLabel>
        <Input
          autoComplete="email"
          placeholder="Enter email"
          type="email"
          value={signInValues.email}
          onChange={(event) => updateSignInField("email", event.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel sx={fieldLabelStyles}>Password</FormLabel>
        <PasswordInput
          autoComplete="current-password"
          placeholder="Enter password"
          value={signInValues.password}
          onChange={(event) => updateSignInField("password", event.target.value)}
        />
      </FormControl>
      <Checkbox
        label="Remember me"
        size="sm"
        checked={signInValues.rememberMe}
        onChange={(event) => updateSignInField("rememberMe", event.target.checked)}
        sx={{ alignSelf: "flex-start", color: "var(--color-font-primary)" }}
      />
      <Button
        type="submit"
        size="lg"
        loading={signInLoading}
        sx={primaryButtonStyles}
      >
        Sign In
      </Button>
    </Stack>
  );
}
