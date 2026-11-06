import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface RenewalReminderProps {
  workspaceName: string | null;
  /** "29 October", preformatted. */
  renewsLabel: string;
  daysLeft: number;
  /** "$49.00", preformatted. Left out when Stripe could not quote the invoice. */
  amountLabel?: string;
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * The reminder a paying customer asked for from the cancel flow instead of cancelling on the spot.
 * It keeps the promise made there and nothing more: the date, the amount, and how to cancel before
 * the card is charged.
 */
export default function RenewalReminder({
  workspaceName,
  renewsLabel,
  daysLeft,
  amountLabel,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: RenewalReminderProps) {
  const workspace = workspaceName ?? "your workspace";

  return (
    <Layout
      preview={`Your Rerun plan renews on ${renewsLabel}`}
      hero={{ scene: "trial-ending", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        Your plan renews in {daysLeft === 1 ? "a day" : `${daysLeft} days`}
      </Heading>
      <Text style={text.paragraph}>
        You asked us to remind you before the plan for{" "}
        <strong>{workspace}</strong> renews. It renews on{" "}
        <strong>{renewsLabel}</strong>, and the card on file is charged then.
        Until that date your coworkers keep running as they are.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            { label: "Renews on", value: renewsLabel },
            ...(amountLabel ? [{ label: "Amount", value: amountLabel }] : []),
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>Review my plan</Button>
      </Section>
      <Text style={text.footnote}>
        Want to cancel? Do it before {renewsLabel} from Billing, in your
        workspace menu, and your card is not charged again.
      </Text>
    </Layout>
  );
}

RenewalReminder.PreviewProps = {
  workspaceName: "Acme",
  renewsLabel: "29 October",
  daysLeft: 7,
  amountLabel: "$49.00",
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies RenewalReminderProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
