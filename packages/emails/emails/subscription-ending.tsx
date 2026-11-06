import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface SubscriptionEndingProps {
  workspaceName: string | null;
  /** "12 March", preformatted. */
  endsLabel: string;
  daysLeft: number;
  /** Until when the paused workspace is saved, "10 June". Preformatted. */
  keptUntilLabel: string;
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * One component for the whole countdown. Only the heading and the preview change with `daysLeft`:
 * the fact being reported is the same one three times, and rewriting it each time is how three
 * reminders end up contradicting each other.
 *
 * It says the workspace is paused rather than deleted, because that is exactly what happens: its
 * machine is archived and the archive kept until `keptUntilLabel`, which a new subscription restores.
 */
export default function SubscriptionEnding({
  workspaceName,
  endsLabel,
  daysLeft,
  keptUntilLabel,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: SubscriptionEndingProps) {
  const workspace = workspaceName ?? "your workspace";
  const heading =
    daysLeft <= 1
      ? "Your subscription ends tomorrow"
      : `Your subscription ends in ${daysLeft} days`;

  return (
    <Layout
      preview={`Your Rerun subscription ends on ${endsLabel}`}
      hero={{ scene: "subscription-ending", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>{heading}</Heading>
      <Text style={text.paragraph}>
        The subscription for <strong>{workspace}</strong> was cancelled and ends
        on <strong>{endsLabel}</strong>. On that date your coworkers stop and your
        workspace is paused.
      </Text>
      <Text style={text.paragraph}>
        Nothing is deleted. Your coworkers, their memories, files and history are
        saved until <strong>{keptUntilLabel}</strong>, and subscribing again
        brings it all back exactly as you left it.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: "Access ends", value: endsLabel },
            { label: "Saved until", value: keptUntilLabel },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>Keep my subscription</Button>
      </Section>
      <Text style={text.footnote}>
        Changed your mind? Reactivating before {endsLabel} leaves everything
        running, with nothing to restore.
      </Text>
    </Layout>
  );
}

SubscriptionEnding.PreviewProps = {
  workspaceName: "Acme",
  endsLabel: "12 March",
  daysLeft: 7,
  keptUntilLabel: "10 June",
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies SubscriptionEndingProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
