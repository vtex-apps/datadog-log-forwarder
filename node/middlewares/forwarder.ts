import { IOContext, AuthType, UserInputError, Logger } from '@vtex/api'
import { LogSource } from '../skidder/logsource'
import { Clients } from '../clients'
import { Datadog } from '../clients/datadog'

/**
 * If isn't tolerable to be asleep while logs are generated,
 * this should be at least as great as the time Skidder would
 * take to restart this service
 */
const timeToLive = 60 * 1000
const timeBetweenBatchs = 10000
const maxSizeBatch = 500

export async function forwarder(ctx: Context, next: () => Promise<any>) {
  const {
    state: { region, apiKey },
    clients,
    vtex,
  } = ctx

  setImmediate(async () => {
    const datadogClient = datadogClientFromRegion(clients, region)
    startEventSource(vtex, apiKey, datadogClient)
  })

  ctx.status = 200
  ctx.set('Cache-Control', 'no-cache')

  await next()  
}

function startEventSource(vtex: IOContext, apiKey: string, client: Datadog) {
  const { authToken, userAgent, logger } = vtex
  const es = new LogSource(vtex, {
    headers: {
      Authorization: `${AuthType.bearer} ${authToken}`,
      'User-Agent': `${userAgent}#${Math.random()}`,  // Remove Random
    }
  })

  es.onopen = () => {
    logger.info('connection started')
  }

  es.onerror = (err) => {
    logger.error(`Error reading logs: ${JSON.stringify(err, null, 2)}`)
  }

  const wd = new Watchdog(timeToLive, es.close);
  wd.start()

  const datadogHeaders = {
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    }
  }

  const batcher = new DatadogBatcher(client, datadogHeaders, logger)

  es.addEventListener('message', async (msg: Event) => {
    wd.rearm()

    try {
      await batcher.batchMessage(JSON.parse((msg as MessageEvent).data))
      //console.log(res)
    } catch (error) {
      logger.error(`Error sending log: ${error}`)
    }
  })
}

function datadogClientFromRegion(clients: Clients, region: string): Datadog {
  switch (region) {
    case 'com':
      return clients.datadogcom
    case 'eu':
      return clients.datadogeu
  }
  throw new UserInputError(`Could not find a Datadog client for ${region} region`)
}

class Watchdog {
  private timeoutHandler?: any
  constructor(private timeout: number, private onTimedOut: Function) { }

  public start() {
    this.timeoutHandler = setTimeout(() => this.onTimedOut, this.timeout);
  }

  public rearm() {
    clearTimeout(this.timeoutHandler)
    this.start()
  }
}

class DatadogBatcher {
  private messages: any[]
  private watchdog: Watchdog

  constructor(private client: Datadog, private headers: any, private logger: Logger) {
    this.messages = []
    this.watchdog = new Watchdog(timeBetweenBatchs, () => this.sendBatch())
    this.watchdog.start()
  }

  async batchMessage(msg: any) {
    if (this.messages.push(msg) >= maxSizeBatch) {
      await this.sendBatch()
    }
  }

  async sendBatch() {
    this.watchdog.rearm()
    const total = this.messages.length

    if (total > 0) {
      const breakingPoint = Math.min(maxSizeBatch, total)
      const batch = this.messages.slice(0, breakingPoint)
      this.messages = this.messages.slice(breakingPoint)

      this.logger.info(`sending batch with ${batch.length}/${total} logs`)
      await this.client.postLog(batch, this.headers)
    }
  }

  async postLogs(logs: any[]): Promise<string | void> {
    try {
      return this.client.postLog(logs, this.headers)
    } catch (reason) {
      this.logger.error(reason)
      this.messages.concat(logs)
    }
  }
}