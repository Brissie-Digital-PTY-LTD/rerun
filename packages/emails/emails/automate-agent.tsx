import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { text } from "../theme";

export interface AutomateAgentProps {
  agentName: string;
  manualRuns: number;
  /** "the last two weeks", preformatted. */
  periodLabel: string;
  /** The last thing the agent reported. No panel without it. */
  lastResult?: string;
  scheduleUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function AutomateAgent({
  agentName,
  manualRuns,
  periodLabel,
  lastResult,
  scheduleUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: AutomateAgentProps) {
  return (
    <Layout
      preview={`You've started ${agentName} by hand ${manualRuns} times`}
      hero={{ scene: "automate-agent", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Let {agentName} start itself</Heading>
      <Text style={text.paragraph}>
        You started <strong>{agentName}</strong> yourself{" "}
        <strong>{manualRuns} times</strong> in {periodLabel}, and every one of
        them finished.
      </Text>

      {lastResult ? <Panel>{lastResult}</Panel> : null}

      <Text style={{ ...text.paragraph, margin: lastResult ? "16px 0" : "0 0 16px" }}>
        The workflow works. On a schedule it does the same job without you
        opening the app to launch it.
      </Text>

      <Section style={cta}>
        <Button href={scheduleUrl}>Schedule the next run</Button>
      </Section>
      <Text style={text.footnote}>
        You review the schedule before it is saved, and you can pause it at any
        time.
      </Text>
    </Layout>
  );
}

AutomateAgent.PreviewProps = {
  agentName: "Atlas",
  manualRuns: 4,
  periodLabel: "the last two weeks",
  lastResult:
    "Checked 84 invoices against the Stripe payouts, 2 did not match and are listed in the Notion page.",
  scheduleUrl: "https://app.rerun.build/?agent=8f2b",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies AutomateAgentProps;

const cta: React.CSSProperties = {
  margin: "24px 0",
};
