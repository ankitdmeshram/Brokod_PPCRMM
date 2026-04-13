import AuthHeader from "../components/auth/AuthHeader";
import AuthShell from "../components/auth/AuthShell";
import AuthSwitchLink from "../components/auth/AuthSwitchLink";
import QuotePanel from "../components/auth/QuotePanel";
import SignInForm from "../components/auth/SignInForm";
import SignUpForm from "../components/auth/SignUpForm";
import { AUTH_ROUTES } from "../router/authRoutes";

const authContent = {
  signin: {
    title: "Welcome Back !",
    subtitle: "Sign in to continue",
  },
  signup: {
    title: "Create Account",
    subtitle: "Sign up to get started",
  },
};

export default function AuthPage({ mode }) {
  const isSignUp = mode === "signup";
  const content = authContent[mode];

  return (
    <AuthShell
      showQuotePanel={!isSignUp}
      quotePanel={<QuotePanel />}
      header={<AuthHeader title={content.title} subtitle={content.subtitle} />}
      form={isSignUp ? <SignUpForm /> : <SignInForm />}
      footer={
        <AuthSwitchLink
          isSignUp={isSignUp}
          href={isSignUp ? AUTH_ROUTES.signIn : AUTH_ROUTES.signUp}
        />
      }
    />
  );
}
