import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { Layout } from "../components/Layout";
import { text, theme } from "../theme";

export interface PublishedAccessCodeProps {
  code: string;
  workspaceName: string;
  pageTitle: string;
  expiresInMinutes: number;
  appUrl: string;
}

export default function PublishedAccessCode({
  code,
  workspaceName,
  pageTitle,
  expiresInMinutes,
  appUrl,
}: PublishedAccessCodeProps) {
  return (
    <Layout preview={`Your code to open ${pageTitle}: ${code}`} appUrl={appUrl}>
      <Heading style={text.heading}>Open {pageTitle}</Heading>
      <Text style={text.paragraph}>
        {workspaceName} shared this page with you. Enter this code on the page to open it.
      </Text>
      <Section style={codeBox}>
        <Text style={codeText}>{code}</Text>
      </Section>
      <Text style={text.footnote}>
        {`The code expires in ${expiresInMinutes} minutes and works once. If you didn't ask for it, you can safely ignore this email.`}
      </Text>
    </Layout>
  );
}

PublishedAccessCode.PreviewProps = {
  code: "482913",
  workspaceName: "Acme",
  pageTitle: "Q3 proposal for Northwind",
  expiresInMinutes: 10,
  appUrl: "https://app.rerun.build",
} satisfies PublishedAccessCodeProps;

const codeBox: React.CSSProperties = {
  backgroundColor: theme.surface.inset,
  border: `1px solid ${theme.surface.border}`,
  borderRadius: theme.radius.inner,
  margin: "8px 0 0",
  padding: "16px 0",
  textAlign: "center",
};

const codeText: React.CSSProperties = {
  color: theme.text.strong,
  fontFamily: theme.font.mono,
  fontSize: "28px",
  fontWeight: 500,
  letterSpacing: "0.3em",
  lineHeight: "36px",
  margin: 0,
};
