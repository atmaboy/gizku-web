import { consumeToken, type ConsumeResult } from '@/lib/emailVerification'
import VerifyResult from './VerifyResult'

export const dynamic = 'force-dynamic'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const status: ConsumeResult = token ? await consumeToken(token) : 'error'

  return <VerifyResult status={status} />
}
