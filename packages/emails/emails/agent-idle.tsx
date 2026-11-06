import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface AgentIdleProps {
  agentName: string;
  /** Preformatted by the sender: this package never touches a Date. */
  createdLabel: string;
  agentUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function AgentIdle({
  agentName,
  createdLabel,
  agentUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: AgentIdleProps) {
  return (
    <Layout
      preview={`${agentName} is ready, but hasn't run yet`}
      hero={{ scene: "agent-idle", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>{agentName} hasn&apos;t run yet</Heading>
      <Text style={text.paragraph}>
        You created <strong>{agentName}</strong> and it has never started a run.
        Give it one small task first: a result you can read in a minute is what
        tells you whether the setup is right before you put it on a schedule.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Coworker", value: agentName },
            { label: "Created", value: createdLabel },
            { label: "Runs", value: "0" },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={agentUrl}>Open {agentName}</Button>
      </Section>
      <Text style={text.footnote}>
        Opening this page does not start a run.
      </Text>
    </Layout>
  );
}

AgentIdle.PreviewProps = {
  agentName: "Atlas",
  createdLabel: "3 hours ago",
  agentUrl: "https://app.rerun.build/?agent=8f2b",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies AgentIdleProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
