import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface SandboxIdleProps {
  /** When the sandbox was last opened, "4 September". Preformatted. */
  lastActiveLabel: string;
  /** When it is archived if nobody opens it, "6 October". Preformatted. */
  archiveLabel: string;
  agentCount: number;
  sandboxUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * The notice a sandbox gets before it is archived for inactivity. Opening the sandbox is enough to
 * cancel it, so the button does exactly that. It also says what an archive costs: coming back
 * afterwards goes through a request to us, not through a click.
 */
export default function SandboxIdle({
  lastActiveLabel,
  archiveLabel,
  agentCount,
  sandboxUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: SandboxIdleProps) {
  return (
    <Layout
      preview={`Your Rerun sandbox is archived on ${archiveLabel} unless you open it`}
      hero={{ scene: "trial-ended", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        Your sandbox is archived on {archiveLabel}
      </Heading>
      <Text style={text.paragraph}>
        Your Rerun sandbox has not been opened since{" "}
        <strong>{lastActiveLabel}</strong>. A sandbox keeps a machine running
        for you, so one that sits unused for 30 days is archived to free it.
      </Text>
      <Text style={text.paragraph}>
        Open your sandbox before <strong>{archiveLabel}</strong> and nothing
        changes. After that date its coworkers and their data are saved, but
        getting it back means asking us to reactivate it.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Last opened", value: lastActiveLabel },
            ...(agentCount > 0
              ? [{ label: "Coworkers", value: String(agentCount) }]
              : []),
            { label: "Archived on", value: archiveLabel },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={sandboxUrl}>Open my sandbox</Button>
      </Section>
    </Layout>
  );
}

SandboxIdle.PreviewProps = {
  lastActiveLabel: "4 September",
  archiveLabel: "6 October",
  agentCount: 2,
  sandboxUrl: "https://app.rerun.build",
  appUrl: "https://app.rerun.build",
} satisfies SandboxIdleProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
