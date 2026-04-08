// Next.js 16 타입 스텁
// next/cache와 next/headers가 이 빌드에 미포함되어 임시 선언

declare module 'next/cache' {
  /**
   * 특정 경로의 캐시를 무효화합니다.
   * @see https://nextjs.org/docs/app/api-reference/functions/revalidatePath
   */
  export function revalidatePath(
    originalPath: string,
    type?: 'layout' | 'page'
  ): void

  /**
   * 특정 태그와 연관된 캐시를 무효화합니다.
   * @see https://nextjs.org/docs/app/api-reference/functions/revalidateTag
   */
  export function revalidateTag(tag: string): void

  /**
   * 특정 경로 또는 경로 패턴에 대한 캐시를 비활성화합니다.
   * @see https://nextjs.org/docs/app/api-reference/functions/unstable_noStore
   */
  export function unstable_noStore(): void
}

declare module 'next/headers' {
  export type ReadonlyRequestCookies = {
    get(name: string): { name: string; value: string } | undefined
    getAll(): { name: string; value: string }[]
    has(name: string): boolean
    set(name: string, value: string, options?: Record<string, unknown>): void
    delete(name: string): void
  }

  /**
   * 서버 컴포넌트 또는 Route Handler에서 요청 쿠키에 접근합니다.
   * @see https://nextjs.org/docs/app/api-reference/functions/cookies
   */
  export function cookies(): Promise<ReadonlyRequestCookies>

  /**
   * 서버 컴포넌트 또는 Route Handler에서 요청 헤더에 접근합니다.
   * @see https://nextjs.org/docs/app/api-reference/functions/headers
   */
  export function headers(): Promise<ReadonlyHeaders>

  export type ReadonlyHeaders = {
    get(name: string): string | null
    has(name: string): boolean
    entries(): IterableIterator<[string, string]>
    keys(): IterableIterator<string>
    values(): IterableIterator<string>
    forEach(callback: (value: string, key: string) => void): void
  }
}
