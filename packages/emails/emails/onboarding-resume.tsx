import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { text } from "../theme";

export interface OnboardingResumeProps {
  firstName: string | null;
  resumeUrl: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

// Nothing is stored while the survey is open, so this email never claims a saved position. What it
// promises is what is true: the questions come back on the next visit and they are short.
export default function OnboardingResume({
  firstName,
  resumeUrl,
  appUrl,
  unsubscribeUrl,
}: OnboardingResumeProps) {
  return (
    <Layout
      preview="Your Rerun setup isn't finished"
      hero={{ scene: "onboarding-resume" }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        {firstName ? `${firstName}, your setup isn't finished` : "Your setup isn't finished"}
      </Heading>
      <Text style={text.paragraph}>
        Your workspace is created, but you left before the end of the setup. It
        takes about a minute: your site, and the tools you already work with.
      </Text>
      <Text style={text.paragraph}>
        Those two answers are what decide which coworkers Rerun puts in front of
        you. Without them you get the generic list.
      </Text>
      <Section style={cta}>
        <Button href={resumeUrl}>Finish setup</Button>
      </Section>
      <Text style={text.footnote}>
        The questions reopen on their own when you land on your workspace.
      </Text>
    </Layout>
  );
}

OnboardingResume.PreviewProps = {
  firstName: "Clément",
  resumeUrl: "https://app.rerun.build",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies OnboardingResumeProps;

const cta: React.CSSProperties = {
  margin: "24px 0",
};
