import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { text } from "../theme";

export interface WorkspaceInviteProps {
  workspaceName: string;
  inviteUrl: string;
  invitedByEmail?: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
}

export default function WorkspaceInvite({
  workspaceName,
  inviteUrl,
  invitedByEmail,
  boardUrl,
  appUrl,
}: WorkspaceInviteProps) {
  return (
    <Layout
      preview={`You're invited to ${workspaceName} on Rerun`}
      hero={{ scene: "workspace-invite", board: boardUrl }}
      appUrl={appUrl}
    >
      <Heading style={text.heading}>You&apos;re invited</Heading>
      <Text style={text.paragraph}>
        {invitedByEmail ? (
          <>
            <strong>{invitedByEmail}</strong> invited you to join{" "}
            <strong>{workspaceName}</strong> on Rerun.
          </>
        ) : (
          <>
            You&apos;ve been invited to join <strong>{workspaceName}</strong> on
            Rerun.
          </>
        )}
      </Text>
      <Text style={text.paragraph}>
        Rerun runs your business with autonomous AI coworkers. Accept the invite to
        start collaborating in this workspace.
      </Text>
      <Section style={cta}>
        <Button href={inviteUrl}>Join {workspaceName}</Button>
      </Section>
      <Text style={text.footnote}>
        This invitation expires in 7 days. If you weren&apos;t expecting it, you
        can safely ignore this email.
      </Text>
    </Layout>
  );
}

WorkspaceInvite.PreviewProps = {
  workspaceName: "Acme Inc.",
  inviteUrl: "https://app.rerun.build/invite/abc123",
  invitedByEmail: "ada@acme.com",
  appUrl: "https://app.rerun.build",
} satisfies WorkspaceInviteProps;

const cta: React.CSSProperties = {
  margin: "24px 0",
};
