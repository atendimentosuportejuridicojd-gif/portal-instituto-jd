import * as React from 'react'
import { Text } from '@react-email/components'
import { CtaButton, EmailLayout, small, text } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl?: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <EmailLayout
    preview="Confirme a alteração do seu e-mail"
    heading="Confirme seu novo e-mail"
  >
    <Text style={text}>
      Você solicitou a alteração do e-mail da sua conta no Portal do Aluno do Instituto J&amp;D
      {oldEmail ? ` de ${oldEmail}` : ''}
      {newEmail ? ` para ${newEmail}` : ''}.
    </Text>
    <Text style={text}>Para concluir a alteração, confirme abaixo:</Text>
    <CtaButton href={confirmationUrl}>Confirmar alteração</CtaButton>
    <Text style={small}>Se você não fez esta solicitação, ignore este e-mail.</Text>
  </EmailLayout>
)

export default EmailChangeEmail
