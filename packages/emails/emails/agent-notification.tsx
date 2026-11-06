import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { theme, text, type ToneName } from "../theme";

// All emailable kinds except `error`, which has its own RunFailed template.
export type AgentNotificationKind =
  | "done"
  | "info"
  | "question"
  | "approval"
  | "connector";

export interface AgentNotificationProps {
  agentName: string;
  kind: AgentNotificationKind;
  message: string;
  /** Why this recipient gets the email, e.g. "You started this conversation." */
  reason?: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  /** Opens the conversation the email is about. Without it the button opens the board. */
  conversationUrl?: string;
  unsubscribeUrl?: string;
}

const COPY: Record<
  AgentNotificationKind,
  { heading: string; lead: string; tone: ToneName }
> = {
  done: {
    heading: "Task done",
    lead: "finished a task.",
    tone: "done",
  },
  info: {
    heading: "Needs your attention",
    lead: "wants you to look at something.",
    tone: "info",
  },
  question: {
    heading: "Coworker has a question",
    lead: "needs an answer to continue.",
    tone: "question",
  },
  approval: {
    heading: "Approval needed",
    lead: "is waiting for your approval.",
    tone: "approval",
  },
  connector: {
    heading: "App setup",
    lead: "needs you to connect a service.",
    tone: "connector",
  },
};

export default function AgentNotification({
  agentName,
  kind,
  message,
  reason,
  boardUrl,
  appUrl,
  conversationUrl,
  unsubscribeUrl,
}: AgentNotificationProps) {
  const copy = COPY[kind];
  return (
    <Layout
      preview={`${agentName}: ${copy.heading}`}
      hero={{ variant: kind, board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>{copy.heading}</Heading>
      <Text style={text.paragraph}>
        Your agent <strong>{agentName}</strong> {copy.lead}
      </Text>
      {reason ? <Text style={reasonLine}>{reason}</Text> : null}
      <Panel tone={copy.tone}>{message}</Panel>
      <Section style={cta}>
        <Button href={conversationUrl ?? appUrl}>
          {conversationUrl ? "Open the conversation" : "Open Rerun"}
        </Button>
      </Section>
    </Layout>
  );
}

AgentNotification.PreviewProps = {
  agentName: "Atlas",
  kind: "question",
  message:
    "I found two candidate database schemas. Which one should I use for the migration?",
  reason: "You started this conversation.",
  appUrl: "https://app.rerun.build",
  conversationUrl: "https://app.rerun.build/?notification=preview",
} satisfies AgentNotificationProps;

const reasonLine: React.CSSProperties = {
  ...text.footnote,
  color: theme.text.muted,
  margin: "0 0 16px",
};

const cta: React.CSSProperties = {
  margin: "24px 0 0",
};
