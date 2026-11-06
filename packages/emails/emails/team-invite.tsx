import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { text } from "../theme";

export interface TeamInviteProps {
  workspaceName: string;
  agentName: string;
  inviteUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function TeamInvite({
  workspaceName,
  agentName,
  inviteUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: TeamInviteProps) {
  return (
    <Layout
      preview={`Bring your team into ${workspaceName}`}
      hero={{ scene: "team-invite", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Bring your team into {workspaceName}</Heading>
      <Text style={text.paragraph}>
        <strong>{agentName}</strong> completed its first successful run, and you
        are still the only person in this workspace.
      </Text>
      <Text style={text.paragraph}>
        If someone else should read its results, approve what it is about to do,
        or keep its workflow running when you are away, they need their own
        access.
      </Text>
      <Section style={cta}>
        <Button href={inviteUrl}>Invite your team</Button>
      </Section>
      <Text style={text.footnote}>
        You decide who joins. Nothing is shared until you send an invitation.
      </Text>
    </Layout>
  );
}

TeamInvite.PreviewProps = {
  workspaceName: "Acme",
  agentName: "Atlas",
  inviteUrl: "https://app.rerun.build/?members=1",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies TeamInviteProps;

const cta: React.CSSProperties = {
  margin: "24px 0",
};
