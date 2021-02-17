export function getLeafAddresses<TLeaf>(
  // eslint-disable-next-line @typescript-eslint/ban-types
  tree: object,
  /** DO NOT PROVIDE, USED FOR RECURSION */
  path: string[] = [],
): [string[], TLeaf][] {
  const branches = Object.entries(tree).flatMap<[string[], TLeaf]>(
    ([key, value]) => {
      const newPath = [...path, key]
      switch (typeof value) {
        case 'object':
          return getLeafAddresses<TLeaf>(value, newPath)
        default:
          return [[newPath, value as TLeaf]]
      }
    },
  )

  return branches
}
