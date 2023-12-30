export class ErrorGenerator extends Error {
  constructor(reason: string, exception?: string[] | null) {
    super(reason +
      '\n' +
      exception?.map((content) => '       | - ' + content)?.join('\n')
    )
  }
}