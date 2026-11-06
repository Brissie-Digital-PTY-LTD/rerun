import * as React from "react";
import { Link, Section, Text } from "@react-email/components";
import { theme, text } from "../theme";

export interface FooterProps {
  unsubscribeUrl?: string;
  unsubscribeLabel?: string;
}

export function Footer({
  unsubscribeUrl,
  unsubscribeLabel = "Unsubscribe",
}: FooterProps) {
  return (
    <Section style={footer}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={ruleTable}>
        <tbody>
          <tr>
            <td height={1} style={rule}>
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={tagline}>
        Run your work on coworkers. Build them, watch them work, and keep your eyes on everything.
      </Text>
      <Text style={legal}>
        © 2026 Rerun
        {unsubscribeUrl ? (
          <>
            <span style={dot}>·</span>
            <Link href={unsubscribeUrl} style={link}>
              {unsubscribeLabel}
            </Link>
          </>
        ) : null}
      </Text>
    </Section>
  );
}

const footer: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: `${theme.width.card}px`,
  textAlign: "left",
};

const ruleTable: React.CSSProperties = {
  borderCollapse: "collapse",
  margin: "24px 0 18px",
};

const rule: React.CSSProperties = {
  backgroundColor: theme.surface.border,
  fontSize: 0,
  height: "1px",
  lineHeight: "1px",
};

const tagline: React.CSSProperties = {
  ...text.footnote,
  color: theme.text.muted,
  margin: 0,
  maxWidth: "400px",
};

const legal: React.CSSProperties = {
  ...text.footnote,
  color: theme.text.faint,
  margin: "6px 0 0",
};

const dot: React.CSSProperties = {
  color: theme.surface.border,
  margin: "0 8px",
};

const link: React.CSSProperties = {
  color: theme.text.faint,
  textDecoration: "underline",
};
