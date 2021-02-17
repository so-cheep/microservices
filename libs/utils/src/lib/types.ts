type StringMap = Record<string, unknown>

/** recusively make a type optional */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export type CollectPaths<
  T extends StringMap,
  P extends string[] = []
> = {
  [K in keyof T]: T[K] extends StringMap
    ? CollectPaths<T[K], [...P, K extends string ? K : string]>
    : [...P, K]
}[keyof T]

/** replaces all leaves of an api with a different type, and making each node a union of the leaf as well, to allow for partial paths */
export type ReplaceLeaves<TApi extends StringMap, TLeaf> = {
  [K in keyof TApi]: TApi[K] extends StringMap
    ? ReplaceLeaves<TApi[K], TLeaf> | TLeaf
    : TLeaf
}

export type ArrayToIntersection<
  T extends unknown[]
> = UnionToIntersection<ArrayToUnion<T>>

export type ArrayToUnion<A extends Array<unknown>> = A[number]

export type UnionToIntersection<U> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  U extends any
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never
