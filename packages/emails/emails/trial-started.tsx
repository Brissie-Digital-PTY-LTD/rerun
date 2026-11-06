import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface TrialStartedProps {
  workspaceName: string | null;
  trialDays: number;
  /** "12 March", preformatted. */
  trialEndsLabel: string;
  /** "$49", preformatted. */
  monthlyPriceLabel: string;
  /** "3 coworkers and 350 credits", what the trial holds. */
  includedLabel: string;
  /** False on the cardless arm of the trial test: nothing rolls over on its own at the end. */
  hasCard?: boolean;
  workspaceUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

export default function TrialStarted({
  workspaceName,
  trialDays,
  trialEndsLabel,
  monthlyPriceLabel,
  includedLabel,
  hasCard = true,
  workspaceUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: TrialStartedProps) {
  const workspace = workspaceName ?? "your workspace";

  return (
    <Layout
      preview={`Your ${trialDays}-day Rerun trial is active`}
      hero={{ scene: "trial-started", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Your trial is active</Heading>
      <Text style={text.paragraph}>
        <strong>{workspace}</strong> is on a {trialDays}-day free trial. Your
        coworkers run, your schedules fire, and nothing is charged today.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: "Included", value: includedLabel },
            { label: "Trial ends", value: trialEndsLabel },
            { label: "Then", value: `${monthlyPriceLabel}/month` },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={workspaceUrl}>Open workspace</Button>
      </Section>
      {hasCard ? (
        <Text style={text.footnote}>
          Your plan starts on its own on {trialEndsLabel}: {monthlyPriceLabel} is
          charged to the card you added, then every month. Not planning to
          continue? Cancel before {trialEndsLabel} from Billing, in your
          workspace menu, and nothing is charged.
        </Text>
      ) : (
        <Text style={text.footnote}>
          No card needed for the trial. To keep going after {trialEndsLabel},
          add one from Billing, in your workspace menu, and your plan starts at{" "}
          {monthlyPriceLabel}/month. Without one, your coworkers stop and
          nothing is charged.
        </Text>
      )}
    </Layout>
  );
}

TrialStarted.PreviewProps = {
  workspaceName: "Acme",
  trialDays: 5,
  trialEndsLabel: "12 March",
  monthlyPriceLabel: "$49",
  includedLabel: "3 coworkers and 350 credits",
  workspaceUrl: "https://app.rerun.build",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies TrialStartedProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
