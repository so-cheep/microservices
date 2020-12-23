export type Props<T extends (...args: any) => any> = Parameters<T>[0]

export type Message<T extends Message<T>> = {
  type: T['type']
}

// export type WithoutPromise<T> = T extends PromiseLike<infer U>
//   ? WithoutPromise<U>
//   : T

// export type Result<T extends (...args: any) => any> = WithoutPromise<
//   ReturnType<T>
// >

export interface Publisher {
  publish<TProps, TResult>(props: TProps): Promise<TResult>
}
