
/**
* @see {@link format}
*/
export const format = (content: string, ...args: (string | object | number | boolean | null)[]) => {
  let pos = 0
  if (!Array.isArray(args)) args = []
  return content.replaceAll(/\{\}/g, (str) => resolveType(args.at(pos++)) ?? str)
}

const resolveType = (arg: string | object | number | boolean | undefined | null): string | null => {
  if (typeof arg === 'string')
    return arg
  else if (typeof arg === 'object')
    return formatJson(arg) ?? ""
  else if (typeof arg === 'boolean')
    return `${arg}`
  else if (typeof arg === 'number')
    return arg.toString()
  else if (typeof arg === 'bigint')
    return `${arg}`
  else if (typeof arg === 'function')
    return `${arg}`
  else if (arg == null)
    return 'null'
  else if (arg == undefined)
    return '[undefined]'
  return null
}

const formatJson = (content: object | Object | null) => {
  try {
    return JSON.stringify(content)
  } catch (error) { }
  return null
}
