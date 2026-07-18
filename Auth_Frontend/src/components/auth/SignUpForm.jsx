import { Box, Button, Checkbox, FormControl, FormLabel, Input, Stack } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import { AUTH_ROUTES } from "../../config/app.config";
import { useAuthContext } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import { fieldLabelStyles, primaryButtonStyles } from "./auth.styles";

const signUpFields = [
  ["First Name", "firstName", "text", "given-name"],
  ["Last Name", "lastName", "text", "family-name"],
  ["Email", "email", "email", "email"],
  ["Phone", "phone", "tel", "tel"],
];

export default function SignUpForm() {
  const navigate = useNavigate();
  const { signUpValues, signUpLoading, updateSignUpField, submitSignUp } =
    useAuthContext();

  return (
    <Stack
      spacing={1.75}
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await submitSignUp()) {
          navigate(AUTH_ROUTES.signIn, { replace: true });
        }
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.5,
        }}
      >
        {signUpFields.map(([label, name, type, autoComplete]) => (
          <FormControl key={name}>
            <FormLabel sx={fieldLabelStyles}>{label}</FormLabel>
            <Input
              autoComplete={autoComplete}
              placeholder={`Enter ${label.toLowerCase()}`}
              type={type}
              value={signUpValues[name]}
              onChange={(event) => updateSignUpField(name, event.target.value)}
            />
          </FormControl>
        ))}
        <FormControl>
          <FormLabel sx={fieldLabelStyles}>Password</FormLabel>
          <PasswordInput
            autoComplete="new-password"
            placeholder="Enter password"
            value={signUpValues.password}
            onChange={(event) => updateSignUpField("password", event.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel sx={fieldLabelStyles}>Confirm Password</FormLabel>
          <PasswordInput
            autoComplete="new-password"
            placeholder="Confirm password"
            value={signUpValues.confirmPassword}
            onChange={(event) => updateSignUpField("confirmPassword", event.target.value)}
          />
        </FormControl>
      </Box>
      <Checkbox
        label="I agree to the terms and conditions"
        size="sm"
        checked={signUpValues.agreeToTerms}
        onChange={(event) => updateSignUpField("agreeToTerms", event.target.checked)}
        sx={{ alignSelf: "flex-start", color: "var(--color-font-primary)" }}
      />
      <Button
        type="submit"
        size="lg"
        loading={signUpLoading}
        sx={primaryButtonStyles}
      >
        Sign Up
      </Button>
    </Stack>
  );
}
