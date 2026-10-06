import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjects } from '../useProjects'

type QueryResult = { data: unknown; error: unknown }

function createChain(result: Promise<QueryResult> | QueryResult) {
  const chain: {
    select: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  } = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockImplementation(() => result)
  chain.single.mockImplementation(() => result)

  return chain
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabaseClient'

describe('useProjects', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('expone loading: true al iniciar y loading: false al finalizar', async () => {
    let resolveProjects!: (value: QueryResult) => void
    let resolveInstallers!: (value: QueryResult) => void

    const projectsPromise = new Promise<QueryResult>((resolve) => {
      resolveProjects = resolve
    })
    const installersPromise = new Promise<QueryResult>((resolve) => {
      resolveInstallers = resolve
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'projects') {
        return createChain(projectsPromise) as never
      }
      return createChain(installersPromise) as never
    })

    const { result } = renderHook(() => useProjects())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveInstallers({ data: [], error: null })
      resolveProjects({ data: [], error: null })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBeNull()
  })

  it('captura y estructura errores de red', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'projects') {
        return createChain(Promise.reject(new Error('Failed to fetch'))) as never
      }
      return createChain({ data: [], error: null }) as never
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toMatchObject({
      message: 'Failed to fetch',
    })
    expect(result.current.projects).toEqual([])
  })

  it('captura denegación RLS y la traduce a un error de aplicación', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'projects') {
        return createChain({
          data: null,
          error: {
            message: 'new row violates row-level security policy',
            code: '42501',
            hint: 'Check RLS policies on projects',
          },
        }) as never
      }
      return createChain({ data: [], error: null }) as never
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error?.code).toBe('42501')
    expect(result.current.error?.message).toMatch(/denegada por seguridad \(RLS\)/i)
    expect(result.current.error?.hint).toMatch(/RLS/i)
  })
})
