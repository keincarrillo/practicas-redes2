import { EventEmitter } from 'events'

export class LineReader extends EventEmitter {
  constructor(stream) {
    super()
    this.buffer = ''
    stream.setEncoding('utf8')
    stream.on('data', chunk => {
      this.buffer += chunk
      let idx
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx)
        this.buffer = this.buffer.slice(idx + 1)
        this.emit('line', line)
      }
    })
    stream.on('error', e => this.emit('error', e))
    stream.on('close', () => this.emit('close'))
    stream.on('end', () => this.emit('end'))
  }
}
