import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { MetaTable } from "../components/MetaTable";
import { text } from "../theme";

export interface PaymentFailedProps {
  workspaceName: string | null;
  /** "$17.62", preformatted. Left out when the invoice carries no amount. */
  amountLabel?: string;
  /** "5 October", preformatted. */
  declinedLabel: string;
  /** When the workspace is paused if nothing is paid, "6 October, 06:10 UTC". Preformatted. */
  pausedLabel: string;
  /** Until when the paused workspace is saved, "3 January". Preformatted. */
  keptUntilLabel: string;
  /** The open invoice on Stripe's own page, where a 3-D Secure confirmation also happens. */
  billingUrl: string;
  /** A capture of the workspace's board, signed by the sender. Without it the usual banner shows. */
  boardUrl?: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/**
 * A renewal that was declined leaves the workspace a day before it is paused, so this is the email
 * that says when the agents stop. The subscription is still there: paying the invoice keeps
 * everything on the same plan, which is why the button goes to the invoice and not to a new checkout.
 */
export default function PaymentFailed({
  workspaceName,
  amountLabel,
  declinedLabel,
  pausedLabel,
  keptUntilLabel,
  billingUrl,
  boardUrl,
  appUrl,
  unsubscribeUrl,
}: PaymentFailedProps) {
  const workspace = workspaceName ?? "your workspace";

  return (
    <Layout
      preview={`Your Rerun payment was declined, your workspace is paused on ${pausedLabel}`}
      hero={{ scene: "trial-ended", board: boardUrl }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>Your payment was declined</Heading>
      <Text style={text.paragraph}>
        The renewal for <strong>{workspace}</strong>
        {amountLabel ? (
          <>
            , <strong>{amountLabel}</strong>,
          </>
        ) : null}{" "}
        did not go through on <strong>{declinedLabel}</strong>. Your bank may
        simply be asking you to confirm it.
      </Text>
      <Text style={text.paragraph}>
        Your workspace keeps running until <strong>{pausedLabel}</strong>. After
        that it is <strong>paused</strong> and your coworkers stop. Nothing is
        deleted: your coworkers and everything they know are saved until{" "}
        <strong>{keptUntilLabel}</strong>. Pay the invoice and nothing changes,
        on the same plan.
      </Text>

      <Section style={meta}>
        <MetaTable
          rows={[
            { label: "Workspace", value: workspace },
            ...(amountLabel ? [{ label: "Amount due", value: amountLabel }] : []),
            { label: "Declined on", value: declinedLabel },
            { label: "Workspace paused", value: pausedLabel },
            { label: "Saved until", value: keptUntilLabel },
          ]}
        />
      </Section>

      <Section style={cta}>
        <Button href={billingUrl}>Pay the invoice</Button>
      </Section>
      <Text style={text.footnote}>
        We will try the card again over the next few days. If one of those
        attempts goes through, your workspace carries on, or is restored on its
        own if it was already paused.
      </Text>
    </Layout>
  );
}

PaymentFailed.PreviewProps = {
  workspaceName: "Acme",
  amountLabel: "$49.00",
  declinedLabel: "12 March",
  pausedLabel: "13 March, 16:00 UTC",
  keptUntilLabel: "10 June",
  billingUrl: "https://app.rerun.build/?billing=1",
  appUrl: "https://app.rerun.build",
} satisfies PaymentFailedProps;

const meta: React.CSSProperties = {
  margin: "0 0 4px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};
