import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { CtaButton, EmailLayout, link, small, text } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview="Confirme seu e-mail para acessar o Portal do Aluno"
    heading="Confirme seu e-mail"
    siteUrl={siteUrl}
  >
    <Text style={text}>
      Seja bem-vindo(a) ao Portal do Aluno do Instituto J&amp;D — Especialistas na Carreira
      Judiciária.
    </Text>
    <Text style={text}>
      Para ativar o acesso de{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>
      , confirme seu endereço de e-mail:
    </Text>
    <CtaButton href={confirmationUrl}>Confirmar e-mail</CtaButton>
    <Text style={small}>
      Se você não criou uma conta, pode ignorar esta mensagem com segurança.
    </Text>
  </EmailLayout>
)

export default SignupEmail
