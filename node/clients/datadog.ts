import { ExternalClient, InstanceOptions, IOContext, RequestConfig } from '@vtex/api'

export function DatadogPartialFromRegion(region : string) {
  return class extends Datadog {
    constructor(context: IOContext, options?: InstanceOptions) {
      super(region, context, options)
    }
  }
}

export class Datadog extends ExternalClient {
  constructor(region: string, context: IOContext, options?: InstanceOptions) {
    super(`https://http-intake.logs.datadoghq.${region}`, context, options)
  }

  public async postLog(log: any, conf?: RequestConfig): Promise<string> {
    return this.http.post(`/v1/input/`, log, conf)
  }
}