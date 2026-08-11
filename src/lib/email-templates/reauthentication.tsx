import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { BRAND, EmailLayout, small, text } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Seu código de verificação" heading="Código de verificação">
    <Text style={text}>
      Use o código abaixo para confirmar sua identidade no Portal do Aluno do Instituto J&amp;D:
    </Text>
    <Section style={codeBox}>
      <Text style={code}>{token}</Text>
    </Section>
    <Text style={small}>Se você não solicitou este código, ignore esta mensagem.</Text>
  </EmailLayout>
)

export default ReauthenticationEmail

const codeBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
}
const code = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  color: BRAND.navy,
  margin: 0,
}
