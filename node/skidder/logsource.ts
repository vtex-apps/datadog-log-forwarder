import { IOContext } from '@vtex/api'
import EventSource = require('eventsource')

const skidderMajor = 1

export class LogSource extends EventSource {
    constructor(vtex: IOContext, opts : EventSource.EventSourceInitDict) {
        const { account, workspace, logger } = vtex
        const url = `http://infra.io.vtex.com/skidder/v${skidderMajor}/${account}/${workspace}/logs/stream`
        logger.info(`connecting with ${url}`)
        super(url, opts)
    }
}