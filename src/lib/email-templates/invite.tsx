import * as React from 'react'
import { Text } from '@react-email/components'
import { CtaButton, EmailLayout, small, text } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview="Você foi convidado para o Portal do Aluno"
    heading="Você recebeu um convite"
    siteUrl={siteUrl}
  >
    <Text style={text}>
      Você foi convidado(a) a acessar o Portal do Aluno do Instituto J&amp;D — Especialistas na
      Carreira Judiciária.
    </Text>
    <Text style={text}>Clique abaixo para criar sua senha e ativar seu acesso:</Text>
    <CtaButton href={confirmationUrl}>Aceitar convite</CtaButton>
    <Text style={small}>Se você não esperava este convite, pode ignorar este e-mail.</Text>
  </EmailLayout>
)

export default InviteEmail
