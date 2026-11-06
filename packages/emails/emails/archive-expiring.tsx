import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface ArchiveExpiringProps {
  workspaceName: string | null;
  /** When the workspace was paused, "12 March". Preformatted. */
  pausedLabel: string;
  /** When the saved copy is deleted, "10 June". Preformatted. */
  deletionLabel: string;
  agentCount: number;
  billingUrl: string;
  /** An archived sandbox comes back through a request to us, not through a subscription. */
  sandbox?: boolean;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * The last word on a paused workspace, a week before its saved copy is deleted. Every email before
 * this one could truthfully say nothing was deleted; this one cannot, so it states the date and
 * says plainly that it is the last chance.
 */
export default function ArchiveExpiring({
  workspaceName,
  pausedLabel,
  deletionLabel,
  agentCount,
  billingUrl,
  sandbox = false,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: ArchiveExpiringProps) {
  const workspace = workspaceName ?? "your workspace";
  const subject = sandbox ? "archived sandbox" : "paused workspace";

  return (
    <Layout
      preview={`Your ${sandbox ? "archived Rerun sandbox" : "paused Rerun workspace"} is deleted on ${deletionLabel}`}
      hero={{ scene: "trial-ended", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        Your {subject} is deleted on {deletionLabel}
      </Heading>
      <Text style={text.paragraph}>
        {workspaceName ? <strong>{workspaceName}</strong> : "Your workspace"}{" "}
        has been {sandbox ? "archived" : "paused"} since{" "}
        <strong>{pausedLabel}</strong>. Its coworkers and everything they know
        are still saved, and this is the last week they will be.
      </Text>
      <Text style={text.paragraph}>
        On <strong>{deletionLabel}</strong>, the saved copy is deleted for good
        and cannot be recovered.{" "}
        {sandbox
          ? "Open your sandbox and request its reactivation before then to get it back exactly as you left it."
          : "Subscribe before then and your workspace comes back exactly as you left it."}
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: sandbox ? "Archived since" : "Paused since", value: pausedLabel },
            ...(agentCount > 0
              ? [{ label: "Coworkers saved", value: String(agentCount) }]
              : []),
            { label: "Deleted on", value: deletionLabel },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>
          {sandbox ? "Open my sandbox" : "Bring my workspace back"}
        </Button>
      </Section>
      <Text style={text.footnote}>
        This is the last email about this {sandbox ? "sandbox" : "workspace"}.
      </Text>
    </Layout>
  );
}

ArchiveExpiring.PreviewProps = {
  workspaceName: "Acme",
  pausedLabel: "12 March",
  deletionLabel: "10 June",
  agentCount: 3,
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies ArchiveExpiringProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
