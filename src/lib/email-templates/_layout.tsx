import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = {
  navy: '#0f1e3d',
  gold: '#c8a04a',
  ink: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
}

export const LOGO_URL =
  'https://portal.institutojd.ia.br/__l5e/assets-v1/37ed9c29-1b7a-48bf-98d0-dea61641d5aa/logo-jd.png'

export const SITE_LABEL = 'Instituto J&D — Especialistas na Carreira Judiciária'

export function EmailLayout({
  preview,
  heading,
  children,
  siteUrl = 'https://portal.institutojd.ia.br',
}: {
  preview: string
  heading: string
  children: React.ReactNode
  siteUrl?: string
}) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Link href={siteUrl}>
              <Img src={LOGO_URL} alt={SITE_LABEL} width="180" style={logo} />
            </Link>
          </Section>
          <Section style={card}>
            <Heading style={h1}>{heading}</Heading>
            {children}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            {SITE_LABEL}
            <br />
            Este é um e-mail automático do Portal do Aluno.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button style={button} href={href}>
      {children}
    </Button>
  )
}

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
export const container = { padding: '24px 16px', maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: BRAND.navy, borderRadius: '10px', padding: '18px 20px', textAlign: 'center' as const }
const logo = { display: 'block', margin: '0 auto', maxWidth: '100%' }
const card = { padding: '28px 4px 8px' }
export const h1 = {
  fontSize: '21px',
  fontWeight: 'bold' as const,
  color: BRAND.navy,
  margin: '0 0 18px',
}
export const text = {
  fontSize: '15px',
  color: BRAND.ink,
  lineHeight: '1.6',
  margin: '0 0 18px',
}
export const small = { fontSize: '13px', color: BRAND.muted, lineHeight: '1.6', margin: '22px 0 0' }
export const link = { color: BRAND.navy, textDecoration: 'underline' }
const button = {
  backgroundColor: BRAND.navy,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: BRAND.border, margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: BRAND.muted, lineHeight: '1.6', margin: 0 }
