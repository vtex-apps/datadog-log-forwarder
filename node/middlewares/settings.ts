export interface Settings {
  region: string,
  apikey: string
}

export const APP_ID = process.env.VTEX_APP_ID!

export async function settings(ctx: Context, next: () => Promise<any>) {
  const {
    clients: {
      apps
    }
  } = ctx

  Object.assign(ctx.state, await apps.getAppSettings(APP_ID))

  await next()
}