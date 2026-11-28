import { NextRequest } from 'next/server'

/**
 * Optional shared-secret gate for broker execution / sensitive account routes.
 * When SMRT_EXECUTION_SECRET is unset, local single-user mode remains open
 * (document the exposure). When set, requests must include matching header.
 */
export function assertExecutionAuthorized(request: NextRequest): { ok: true } | { ok: false; status: number; message: string } {
  const required = process.env.SMRT_EXECUTION_SECRET?.trim()
  if (!required) {
    return { ok: true }
  }
  const provided = request.headers.get('x-smrt-execution-secret')?.trim()
  if (!provided || provided !== required) {
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized. Provide a valid x-smrt-execution-secret header matching SMRT_EXECUTION_SECRET.',
    }
  }
  return { ok: true }
}
