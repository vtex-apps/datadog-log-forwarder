import { IOClients } from '@vtex/api'

import { DatadogPartialFromRegion } from './datadog'

// Extend the default IOClients implementation with our own custom clients.
export class Clients extends IOClients {
  public get datadogcom() {
    return this.getOrSet('datadog', DatadogPartialFromRegion('com'))
  }

  public get datadogeu() {
    return this.getOrSet('datadog', DatadogPartialFromRegion('eu')) 
  }
}
