import * as React from 'react'
import { Text } from '@react-email/components'
import { CtaButton, EmailLayout, small, text } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout preview="Redefinição de senha do Portal do Aluno" heading="Redefinir sua senha">
    <Text style={text}>
      Recebemos um pedido para redefinir a senha da sua conta no Portal do Aluno do Instituto
      J&amp;D.
    </Text>
    <Text style={text}>Clique no botão abaixo para cadastrar uma nova senha:</Text>
    <CtaButton href={confirmationUrl}>Criar nova senha</CtaButton>
    <Text style={small}>
      Se você não solicitou a redefinição, ignore este e-mail — sua senha atual continua válida.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
