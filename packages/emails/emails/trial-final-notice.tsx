import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface TrialFinalNoticeProps {
  /**
   * Whether Stripe holds a card for this trial. The two readers are in opposite situations: one is
   * about to be charged and must not be told their workspace is pausing, the other is about to see it paused.
   */
  hasCard: boolean;
  workspaceName: string | null;
  /** "12 March, 14:00 UTC", preformatted. */
  trialEndsLabel: string;
  /** When an unpaid workspace is paused, same format. */
  pausedLabel: string;
  /** Until when the paused workspace is saved, "11 June". Preformatted. */
  keptUntilLabel: string;
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function TrialFinalNotice({
  hasCard,
  workspaceName,
  trialEndsLabel,
  pausedLabel,
  keptUntilLabel,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: TrialFinalNoticeProps) {
  const workspace = workspaceName ?? "your workspace";

  return (
    <Layout
      preview={
        hasCard
          ? `Your Rerun plan starts at ${trialEndsLabel}`
          : `Add a card before ${trialEndsLabel} to keep your Rerun coworkers running`
      }
      hero={{ scene: "trial-ending", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Your trial ends in 2 hours</Heading>
      {hasCard ? (
        <Text style={text.paragraph}>
          The trial for <strong>{workspace}</strong> ends at{" "}
          <strong>{trialEndsLabel}</strong>. Your plan starts then, and the card
          on file is charged for your first month. Your coworkers keep running,
          there is nothing to do.
        </Text>
      ) : (
        <>
          <Text style={text.paragraph}>
            The trial for <strong>{workspace}</strong> ends at{" "}
            <strong>{trialEndsLabel}</strong>, and there is no card on file.
          </Text>
          <Text style={text.paragraph}>
            Without a plan, your coworkers stop at the end of the trial and your
            workspace is <strong>paused at {pausedLabel}</strong>. Nothing is
            deleted: your coworkers and everything they know are saved until{" "}
            {keptUntilLabel}, and subscribing brings it all back exactly as you
            left it.
          </Text>
        </>
      )}

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: "Trial ends", value: trialEndsLabel },
            ...(hasCard ? [] : [{ label: "Workspace paused", value: pausedLabel }]),
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>{hasCard ? "Review my plan" : "Start my plan"}</Button>
      </Section>
      {hasCard ? (
        <Text style={text.footnote}>
          Not planning to continue? Cancel before {trialEndsLabel} from Billing,
          in your workspace menu, and your card is not charged.
        </Text>
      ) : null}
    </Layout>
  );
}

TrialFinalNotice.PreviewProps = {
  hasCard: false,
  workspaceName: "Acme",
  trialEndsLabel: "12 March, 14:00 UTC",
  pausedLabel: "12 March, 16:00 UTC",
  keptUntilLabel: "10 June",
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies TrialFinalNoticeProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
