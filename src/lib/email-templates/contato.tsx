import * as React from 'react'
import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import { BRAND, BANNER_URL, SITE_LABEL, main, container, text } from './_layout'

interface ContatoEmailProps {
  assunto: string
  /** Texto escrito pelo administrador; cada linha em branco separa um parágrafo. */
  mensagem: string
}

/** E-mail de contato escrito pelo administrador (diferente dos e-mails automáticos de autenticação). */
export const ContatoEmail = ({ assunto, mensagem }: ContatoEmailProps) => {
  const paragrafos = mensagem
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{assunto}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Link href="https://portal.institutojd.ia.br">
              <Img src={BANNER_URL} alt={SITE_LABEL} width="528" style={logo} />
            </Link>
          </Section>
          <Section style={{ padding: '28px 4px 8px' }}>
            {paragrafos.map((p, i) => (
              <Text key={i} style={text}>
                {p.split('\n').map((linha, j, arr) => (
                  <React.Fragment key={j}>
                    {linha}
                    {j < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </Text>
            ))}
          </Section>
          <Hr style={{ borderColor: BRAND.border, margin: '28px 0 16px' }} />
          <Text style={{ fontSize: '12px', color: BRAND.muted, lineHeight: '1.6', margin: 0 }}>
            {SITE_LABEL}
            <br />
            Você pode responder diretamente a este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const header = { backgroundColor: BRAND.navy, borderRadius: '10px', padding: 0, textAlign: 'center' as const, overflow: 'hidden' as const }
const logo = { display: 'block', width: '100%', height: 'auto', borderRadius: '10px' }

export default ContatoEmail
