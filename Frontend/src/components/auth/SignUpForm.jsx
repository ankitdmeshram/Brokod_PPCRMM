import { Box, Button, Checkbox, FormControl, FormLabel, Input, Stack } from "@mui/joy";
import { useAuthContext } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import {
  checkboxStyles,
  fieldLabelStyles,
  primaryButtonStyles,
} from "./authStyles";

const signUpFields = [
  {
    label: "First Name",
    placeholder: "Enter first name",
    type: "text",
    name: "firstName",
  },
  {
    label: "Last Name",
    placeholder: "Enter last name",
    type: "text",
    name: "lastName",
  },
  { label: "Email", placeholder: "Enter email", type: "email", name: "email" },
  { label: "Phone", placeholder: "Enter phone number", type: "tel", name: "phone" },
  {
    label: "Password",
    placeholder: "Enter password",
    type: "password",
    name: "password",
  },
  {
    label: "Confirm Password",
    placeholder: "Confirm password",
    type: "password",
    name: "confirmPassword",
  },
];

export default function SignUpForm() {
  const { signUpValues, signUpStatus, updateSignUpField, submitSignUp } =
    useAuthContext();

  return (
    <Stack
      spacing={1.75}
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        await submitSignUp();
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.5,
        }}
      >
        {signUpFields.map((field) => (
          <FormControl key={field.label}>
            <FormLabel sx={fieldLabelStyles}>{field.label}</FormLabel>
            {field.type === "password" ? (
              <PasswordInput
                placeholder={field.placeholder}
                value={signUpValues[field.name]}
                onChange={(event) =>
                  updateSignUpField(field.name, event.target.value)
                }
              />
            ) : (
              <Input
                placeholder={field.placeholder}
                type={field.type}
                value={signUpValues[field.name]}
                onChange={(event) =>
                  updateSignUpField(field.name, event.target.value)
                }
              />
            )}
          </FormControl>
        ))}
      </Box>

      <Checkbox
        label="I agree to the terms and conditions"
        size="sm"
        checked={signUpValues.agreeToTerms}
        onChange={(event) =>
          updateSignUpField("agreeToTerms", event.target.checked)
        }
        sx={checkboxStyles}
      />

      <Button
        type="submit"
        size="lg"
        loading={signUpStatus.loading}
        sx={{ ...primaryButtonStyles, mt: 0.25 }}
      >
        Sign Up
      </Button>
    </Stack>
  );
}
