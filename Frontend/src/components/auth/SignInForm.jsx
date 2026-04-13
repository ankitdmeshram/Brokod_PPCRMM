import { Button, Checkbox, FormControl, FormLabel, Input, Stack } from "@mui/joy";
import { useAuthContext } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import {
  checkboxStyles,
  fieldLabelStyles,
  primaryButtonStyles,
} from "./authStyles";

export default function SignInForm() {
  const { signInValues, signInStatus, updateSignInField, submitSignIn } =
    useAuthContext();

  return (
    <Stack
      spacing={2.25}
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        await submitSignIn();
      }}
    >
      <FormControl>
        <FormLabel sx={fieldLabelStyles}>Email</FormLabel>
        <Input
          placeholder="Enter email"
          type="email"
          value={signInValues.email}
          onChange={(event) => updateSignInField("email", event.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel sx={fieldLabelStyles}>Password</FormLabel>
        <PasswordInput
          placeholder="Enter password"
          value={signInValues.password}
          onChange={(event) => updateSignInField("password", event.target.value)}
        />
      </FormControl>

      <Checkbox
        label="Remember me"
        size="sm"
        checked={signInValues.rememberMe}
        onChange={(event) =>
          updateSignInField("rememberMe", event.target.checked)
        }
        sx={checkboxStyles}
      />

      <Button
        type="submit"
        size="lg"
        loading={signInStatus.loading}
        sx={{ ...primaryButtonStyles, mt: 0.5 }}
      >
        Sign In
      </Button>
    </Stack>
  );
}
