export type StringMap = Record<string, unknown>
type GenericFunction = (...args: unknown[]) => unknown

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

export type UnionOfValues<T extends StringMap> = T[keyof T]
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

export type KeysByCondition<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
}

export type MatchingKeys<Base, Condition> = KeysByCondition<
  Base,
  Condition
>[keyof Base]

export type FilterByCondition<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
}

export type OnlyFunction<T> = FilterByCondition<T, GenericFunction>

// eslint-disable-next-line @typescript-eslint/ban-types
export type OnlyFunctionArgs<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => unknown
    ? A
    : // eslint-disable-next-line @typescript-eslint/ban-types
      AllFunctionArgs<T[K]>
}

export type AllFunctionArgs<T> = UnionOfValues<OnlyFunctionArgs<T>>

//#region All Function Args test
type T = {
  Event: {
    A: {
      A1: (num: number) => void
      A2: (num: number) => void
    }
    B: {
      B1: (num: number) => void
      B2: (str: string) => void
    }
    C: {
      C1: () => void
      C2: (num: number, str: string) => void
    }
  }
}

type A = AllFunctionArgs<T>

const A1: A = [1]
const A2: A = [2]
const B1: A = [3]
const B2: A = ['x']
const C1: A = []
const C2: A = [2, 'y']
//  uncomment the next line to check
// const fail:A = [true]
