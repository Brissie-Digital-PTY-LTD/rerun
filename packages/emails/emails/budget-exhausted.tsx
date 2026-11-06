import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { theme, text } from "../theme";

export interface BudgetExhaustedProps {
  workspaceName: string | null;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function BudgetExhausted({
  workspaceName,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: BudgetExhaustedProps) {
  return (
    <Layout
      preview="Your Rerun credits are used up"
      hero={{ scene: "budget-exhausted", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Rerun credits used up</Heading>
      <Text style={text.paragraph}>
        {workspaceName ? (
          <>
            The Rerun credits of <strong>{workspaceName}</strong> are used up
            for this month.
          </>
        ) : (
          <>Your workspace&apos;s Rerun credits are used up for this month.</>
        )}{" "}
        Scheduled and triggered runs on Rerun models are paused until they reset
        or you add credits.
      </Text>
      <Text style={hint}>Coworkers using their own API keys keep running.</Text>
      <Section style={cta}>
        <Button href={appUrl}>Add credits</Button>
      </Section>
    </Layout>
  );
}

BudgetExhausted.PreviewProps = {
  workspaceName: "Acme",
  appUrl: "https://app.rerun.build",
} satisfies BudgetExhaustedProps;

const hint: React.CSSProperties = {
  ...text.footnote,
  borderLeft: `2px solid ${theme.surface.border}`,
  margin: "0 0 4px",
  paddingLeft: "12px",
};

const cta: React.CSSProperties = {
  margin: "24px 0 0",
};
