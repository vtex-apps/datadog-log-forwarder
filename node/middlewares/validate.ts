import { UserInputError } from '@vtex/api'

export async function validate(ctx: Context, next: () => Promise<any>) {
  validateRegion(ctx.state.region) 
  validateApiKey(ctx.state.apiKey)

  await next()
}

function validateRegion(region: string) : boolean {
  if (!region) {
    throw new UserInputError('Error parsing Apps config: region is not present')
  }
  
  return true
}

function validateApiKey(apiKey: string) : boolean {
  if (!apiKey) {
    throw new UserInputError('Error parsing Apps config: apiKey is not present')
  }

  return true
}