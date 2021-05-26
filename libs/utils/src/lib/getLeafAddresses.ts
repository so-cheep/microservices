export function getLeafAddresses<TLeaf>(
  // eslint-disable-next-line @typescript-eslint/ban-types
  tree: object,
  opts: {
    replacer?: ([key, value]: [
      string | symbol | number,
      unknown,
    ]) => [string, unknown]
  } = {},
  /** DO NOT PROVIDE, USED FOR RECURSION */
  path: string[] = [],
): [string[], TLeaf][] {
  const branches = Object.entries(tree).flatMap<[string[], TLeaf]>(
    entries => {
      const [key, value] = opts.replacer
        ? opts.replacer(entries)
        : entries
      const newPath = [...path, key]
      switch (typeof value) {
        case 'object':
          return getLeafAddresses<TLeaf>(value, opts, newPath)
        default:
          return [[newPath, value as TLeaf]]
      }
    },
  )

  return branches
}
