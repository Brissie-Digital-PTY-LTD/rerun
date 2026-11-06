import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { text, theme } from "../theme";

export interface SignInCodeProps {
  code: string;
  // Left out for an account that is already signed in and confirms a new address: the code is
  // typed where it was asked for, and a sign-in link would lead that account nowhere.
  signInUrl?: string;
  expiresInMinutes: number;
  appUrl: string;
}

export default function SignInCode({
  code,
  signInUrl,
  expiresInMinutes,
  appUrl,
}: SignInCodeProps) {
  return (
    <Layout preview={`Your Rerun code is ${code}`} appUrl={appUrl}>
      <Heading style={text.heading}>
        {signInUrl ? "Sign in to Rerun" : "Confirm your new email"}
      </Heading>
      <Text style={text.paragraph}>
        {signInUrl
          ? "Enter this code in the tab where you asked for it, or use the button below to sign in right away."
          : "Enter this code in your Rerun account settings to make this the email of your account."}
      </Text>
      <Section style={codeBox}>
        <Text style={codeText}>{code}</Text>
      </Section>
      {signInUrl ? (
        <Section style={cta}>
          <Button href={signInUrl}>Sign in to Rerun</Button>
        </Section>
      ) : null}
      <Text style={text.footnote}>
        {signInUrl
          ? `The code and the button expire in ${expiresInMinutes} minutes and work once. If you didn't ask for them, you can safely ignore this email.`
          : `The code expires in ${expiresInMinutes} minutes and works once. If you didn't ask for it, you can safely ignore this email.`}
      </Text>
    </Layout>
  );
}

SignInCode.PreviewProps = {
  code: "482913",
  signInUrl: "https://app.rerun.build/auth/confirm?token_hash=abc123&type=magiclink",
  expiresInMinutes: 15,
  appUrl: "https://app.rerun.build",
} satisfies SignInCodeProps;

const codeBox: React.CSSProperties = {
  backgroundColor: theme.surface.inset,
  border: `1px solid ${theme.surface.border}`,
  borderRadius: theme.radius.inner,
  margin: "8px 0 0",
  padding: "16px 0",
  textAlign: "center",
};

const codeText: React.CSSProperties = {
  color: theme.text.strong,
  fontFamily: theme.font.mono,
  fontSize: "28px",
  fontWeight: 500,
  letterSpacing: "0.3em",
  lineHeight: "36px",
  margin: 0,
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
