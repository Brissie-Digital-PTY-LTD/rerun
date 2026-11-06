import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface TrialEndingProps {
  workspaceName: string | null;
  /** "12 March", preformatted. */
  trialEndsLabel: string;
  daysLeft: number;
  /** Until when the workspace is saved once paused, "11 June". Preformatted. */
  keptUntilLabel: string;
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * Has to read true for both kinds of trial: the one every account starts at signup without a card,
 * and the one that came out of Checkout with a card. Nothing in the database says which, so the
 * copy states the condition instead of asserting the state.
 */
export default function TrialEnding({
  workspaceName,
  trialEndsLabel,
  daysLeft,
  keptUntilLabel,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: TrialEndingProps) {
  const workspace = workspaceName ?? "your workspace";

  return (
    <Layout
      preview={`Your Rerun trial ends on ${trialEndsLabel}`}
      hero={{ scene: "trial-ending", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        Your trial ends in {daysLeft === 1 ? "a day" : `${daysLeft} days`}
      </Heading>
      <Text style={text.paragraph}>
        The trial for <strong>{workspace}</strong> ends on{" "}
        <strong>{trialEndsLabel}</strong>. From then on your plan bills to the
        card on file every month. Without a card on file, your coworkers stop
        running and your workspace is paused 2 hours after your trial ends.
      </Text>
      <Text style={text.paragraph}>
        Nothing is deleted: your coworkers and everything they know are saved
        until {keptUntilLabel}, and subscribing brings it all back exactly as
        you left it.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: "Trial ends", value: trialEndsLabel },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>Start my plan</Button>
      </Section>
      <Text style={text.footnote}>
        Not planning to continue? Cancel before {trialEndsLabel} from Billing,
        in your workspace menu, and nothing is charged.
      </Text>
    </Layout>
  );
}

TrialEnding.PreviewProps = {
  workspaceName: "Acme",
  trialEndsLabel: "12 March",
  daysLeft: 1,
  keptUntilLabel: "10 June",
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies TrialEndingProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
