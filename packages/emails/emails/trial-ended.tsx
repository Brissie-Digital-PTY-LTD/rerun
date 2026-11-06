import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

/**
 * What the trial actually produced. Left out for a workspace that did nothing, so the email makes
 * no claim rather than printing a row of zeros.
 */
export interface TrialSummary {
  agents: number;
  runs: number;
}

/**
 * Why the trial did not turn into a plan. A declined first charge is usually a card asking for a
 * 3-D Secure confirmation off-session: that person wants to pay, and the email says so.
 */
export type TrialEndedReason = "no_card" | "payment_failed";

export interface TrialEndedProps {
  reason: TrialEndedReason;
  workspaceName: string | null;
  /** "12 March", preformatted. */
  trialEndedLabel: string;
  /** When the workspace is paused, "13 March, 14:00 UTC" style. Preformatted. */
  pausedLabel: string;
  /** Until when the paused workspace is saved, "11 June". Preformatted. */
  keptUntilLabel: string;
  summary?: TrialSummary;
  /** Where the button goes: the open invoice for a declined charge, the plans page otherwise. */
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * The one email that has to be read. Nothing is deleted at the end of a trial: the workspace is
 * paused and saved, and the email says until when, so that the date reads as a reason to come
 * back rather than a threat. The summary of what the trial produced sits right next to it: the
 * argument for staying is the work already done.
 */
export default function TrialEnded({
  reason,
  workspaceName,
  trialEndedLabel,
  pausedLabel,
  keptUntilLabel,
  summary,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: TrialEndedProps) {
  const workspace = workspaceName ?? "your workspace";

  const paymentFailed = reason === "payment_failed";

  return (
    <Layout
      preview={
        paymentFailed
          ? `Your first Rerun payment failed, your workspace is paused on ${pausedLabel}`
          : `Your Rerun trial has ended, your workspace is paused on ${pausedLabel}`
      }
      hero={{ scene: "trial-ended", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        {paymentFailed ? "Your first payment failed" : "Your trial has ended"}
      </Heading>
      <Text style={text.paragraph}>
        {paymentFailed ? (
          <>
            The trial for <strong>{workspace}</strong> ended on{" "}
            <strong>{trialEndedLabel}</strong>, and the first charge to your
            card did not go through. Your bank may simply be asking you to
            confirm it.
          </>
        ) : (
          <>
            The trial for <strong>{workspace}</strong> ended on{" "}
            <strong>{trialEndedLabel}</strong>, and your coworkers have stopped.
          </>
        )}
      </Text>
      <Text style={text.paragraph}>
        Your workspace is <strong>paused on {pausedLabel}</strong>. Nothing is
        deleted: your coworkers and everything they know are saved until{" "}
        <strong>{keptUntilLabel}</strong>.{" "}
        {paymentFailed
          ? "Pay the invoice before it is paused to keep it running, or subscribe any time before then and it all comes back exactly as you left it."
          : "Subscribe any time before then and it all comes back exactly as you left it."}
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Trial ended", value: trialEndedLabel },
            { label: "Workspace paused", value: pausedLabel },
            { label: "Saved until", value: keptUntilLabel },
            ...(summary
              ? [
                  { label: "Coworkers", value: String(summary.agents) },
                  { label: "Runs", value: String(summary.runs) },
                ]
              : []),
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>
          {paymentFailed ? "Pay the invoice" : "Start my plan"}
        </Button>
      </Section>
      <Text style={text.footnote}>
        Not the right time? You can leave it, nothing further will be charged.
        Your workspace stays saved until {keptUntilLabel}.
      </Text>
    </Layout>
  );
}

TrialEnded.PreviewProps = {
  reason: "no_card",
  workspaceName: "Acme",
  trialEndedLabel: "12 March",
  pausedLabel: "12 March, 16:00 UTC",
  keptUntilLabel: "10 June",
  summary: { agents: 3, runs: 41 },
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies TrialEndedProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
