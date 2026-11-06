import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { Panel } from "../components/Panel";
import { theme, text } from "../theme";

export interface RunFailedProps {
  agentName: string;
  runId: string;
  errorMessage: string;
  /** Why this recipient gets the email, e.g. "You started this run." */
  reason?: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  /** Opens the conversation the email is about. Without it the button opens the board. */
  conversationUrl?: string;
  unsubscribeUrl?: string;
}

export default function RunFailed({
  agentName,
  runId,
  errorMessage,
  reason,
  boardUrl,
  appUrl,
  conversationUrl,
  unsubscribeUrl,
}: RunFailedProps) {
  return (
    <Layout
      preview={`${agentName} ran into an error`}
      hero={{ variant: "failed", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Run failed</Heading>
      <Text style={text.paragraph}>
        Your coworker <strong>{agentName}</strong> stopped with an error.
      </Text>
      {reason ? <Text style={reasonLine}>{reason}</Text> : null}
      <Panel tone="error" mono>
        {errorMessage}
      </Panel>
      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Coworker", value: agentName },
            ...(runId ? [{ label: "Run", value: runId }] : []),
          ]}
        />
      </Section>
      <Section style={cta}>
        <Button href={conversationUrl ?? appUrl}>
          {conversationUrl ? "Open the conversation" : "Open Rerun"}
        </Button>
      </Section>
    </Layout>
  );
}

RunFailed.PreviewProps = {
  agentName: "Atlas",
  runId: "run_4f2a9c",
  errorMessage: "Tool call timed out after 900s while waiting for the engine.",
  reason: "You follow Atlas's scheduled tasks.",
  appUrl: "https://app.rerun.build",
  conversationUrl: "https://app.rerun.build/?notification=preview",
} satisfies RunFailedProps;

const reasonLine: React.CSSProperties = {
  ...text.footnote,
  color: theme.text.muted,
  margin: "0 0 16px",
};

const meta: React.CSSProperties = {
  margin: "16px 0 0",
};

const cta: React.CSSProperties = {
  margin: "24px 0 0",
};
