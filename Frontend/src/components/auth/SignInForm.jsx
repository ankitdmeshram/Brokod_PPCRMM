import { Button, Checkbox, FormControl, FormLabel, Input, Stack } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { APP_ROUTES } from "../../router/authRoutes";
import PasswordInput from "./PasswordInput";
import {
  checkboxStyles,
  fieldLabelStyles,
  primaryButtonStyles,
} from "./authStyles";

export default function SignInForm() {
  const navigate = useNavigate();
  const { signInValues, signInStatus, updateSignInField, submitSignIn } =
    useAuthContext();

  return (
    <Stack
      spacing={2.25}
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await submitSignIn();
        if (result) {
          navigate(APP_ROUTES.workspace, { replace: true });
        }
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
