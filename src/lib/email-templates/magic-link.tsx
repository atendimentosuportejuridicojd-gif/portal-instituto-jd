import * as React from 'react'
import { Text } from '@react-email/components'
import { CtaButton, EmailLayout, small, text } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout preview="Seu link de acesso ao Portal do Aluno" heading="Seu link de acesso">
    <Text style={text}>
      Use o botão abaixo para entrar no Portal do Aluno do Instituto J&amp;D. O link é pessoal e
      expira em pouco tempo.
    </Text>
    <CtaButton href={confirmationUrl}>Entrar no portal</CtaButton>
    <Text style={small}>Se você não solicitou este acesso, ignore esta mensagem.</Text>
  </EmailLayout>
)

export default MagicLinkEmail
