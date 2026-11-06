import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { text } from "../theme";

export interface CreatorPitchProps {
  firstName: string | null;
  /** The agent they actually built, when there is one worth naming. */
  agentName: string | null;
  creatorUrl: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

// No hero: this one is a proposition, not a report, and the band would dress it up.
export default function CreatorPitch({
  firstName,
  agentName,
  creatorUrl,
  appUrl,
  unsubscribeUrl,
}: CreatorPitchProps) {
  return (
    <Layout
      preview="Sell the coworkers you build on Rerun"
      hero={{ scene: "creator-pitch" }}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={text.heading}>
        {firstName ? `${firstName}, sell what you built` : "Sell what you built"}
      </Heading>
      <Text style={text.paragraph}>
        {agentName ? (
          <>
            You built <strong>{agentName}</strong> in Rerun. If it solves a
            problem other people have too, you can package it as a template they
            install in one click.
          </>
        ) : (
          <>
            You built working coworkers in Rerun. If one of them solves a problem
            other people have too, you can package it as a template they install
            in one click.
          </>
        )}
      </Text>
      <Text style={text.paragraph}>
        As a Rerun Creator you set the price, we handle the checkout and the
        payouts, and buyers land on a setup that already runs.
      </Text>
      <Section style={cta}>
        <Button href={creatorUrl}>Become a Creator</Button>
      </Section>
      <Text style={text.footnote}>
        {agentName
          ? `Start with ${agentName}, or build something for the marketplace from scratch.`
          : "Start from a coworker you already have, or build something for the marketplace from scratch."}
      </Text>
    </Layout>
  );
}

CreatorPitch.PreviewProps = {
  firstName: "Clément",
  agentName: "Atlas",
  creatorUrl: "https://app.rerun.build/creator",
  appUrl: "https://app.rerun.build",
  unsubscribeUrl: "https://app.rerun.build/unsubscribe",
} satisfies CreatorPitchProps;

const cta: React.CSSProperties = {
  margin: "24px 0",
};
