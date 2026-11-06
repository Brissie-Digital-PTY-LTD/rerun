import * as React from "react";
import { Heading, Img, Link, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { theme, text } from "../theme";

// One email for the whole program. `outreach` writes to someone whose listing we prefilled from
// their public work and who never asked for anything, `application` answers someone who applied:
// same link, same box, only the opening changes.
export type CreatorInviteContext = "outreach" | "application";

export interface CreatorInviteProps {
  firstName: string;
  joinUrl: string;
  appUrl: string;
  context: CreatorInviteContext;
  cardImageUrl?: string;
  unsubscribeUrl?: string;
}

// This one keeps the expert card as its visual: a portrait of the recipient's own listing beats
// any generic illustration, so it gets no hero band.
export default function CreatorInvite({
  firstName,
  joinUrl,
  appUrl,
  context,
  cardImageUrl,
  unsubscribeUrl,
}: CreatorInviteProps) {
  const outreach = context === "outreach";

  return (
    <Layout
      preview={
        outreach
          ? "Built from your public work. Claim your profile and your sandbox."
          : "You are in. Claim your sandbox and start building templates."
      }
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
      unsubscribeLabel={unsubscribeUrl ? "Remove my profile" : undefined}
    >
      <Heading style={text.heading}>
        {outreach ? `Congratulations, ${firstName}` : `You are in, ${firstName}`}
      </Heading>

      {outreach ? (
        <Text style={text.paragraph}>
          Your profile was just added to our directory of professionals who
          design and deploy AI coworkers. We pre-filled your listing from your
          public work.
        </Text>
      ) : (
        <Text style={text.paragraph}>
          We reviewed your application to the Rerun Creator program and we would
          love to have you on board.
        </Text>
      )}

      {cardImageUrl ? (
        <Section style={cardWrap}>
          <Link href={joinUrl} style={cardLinkWrap}>
            <Img
              src={cardImageUrl}
              width="340"
              alt={`${firstName}'s Rerun Expert card`}
              style={card}
            />
          </Link>
        </Section>
      ) : null}

      <Text style={text.paragraph}>
        The link below creates your creator account and hands you a sandbox: an
        unlimited workspace where you build coworkers, capture them as templates, and
        publish them to the marketplace. Creators keep the revenue on every paid
        template they ship.
      </Text>

      <Section style={cta}>
        <Button href={joinUrl}>Claim my box</Button>
      </Section>

      <Text style={text.paragraph}>
        You will be asked to accept the program conditions before the sandbox
        opens. It takes a minute. Your public listing stays yours to edit from
        the app, whenever you want.
      </Text>
      <Text style={small}>
        If the button does not work, paste this into your browser:{" "}
        <Link href={joinUrl} style={inlineLink}>
          {joinUrl}
        </Link>
      </Text>

      <Text style={signoff}>— The Rerun Team</Text>
    </Layout>
  );
}

CreatorInvite.PreviewProps = {
  firstName: "Alex",
  joinUrl: "https://app.rerun.build/creator/join/q3qmbe89",
  appUrl: "https://app.rerun.build",
  context: "outreach",
  cardImageUrl: "https://app.rerun.build/experts/alex-mercier/card.png",
  unsubscribeUrl: "https://rerun.build/community/experts/unsubscribe/q3qmbe89",
} satisfies CreatorInviteProps;

const cardWrap: React.CSSProperties = {
  margin: "24px 0",
  textAlign: "center",
};

const cardLinkWrap: React.CSSProperties = {
  color: theme.brand.light,
  display: "inline-block",
  textDecoration: "none",
};

const card: React.CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderRadius: "16px",
};

const cta: React.CSSProperties = {
  margin: "24px 0",
};

const small: React.CSSProperties = {
  ...text.footnote,
  margin: "0 0 16px",
  wordBreak: "break-all",
};

const inlineLink: React.CSSProperties = {
  color: theme.brand.light,
  textDecoration: "underline",
};

const signoff: React.CSSProperties = {
  ...text.paragraph,
  color: theme.text.faint,
  margin: "24px 0 0",
};
