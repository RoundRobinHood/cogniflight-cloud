import paths from "./paths";
import { encode, decode } from "@msgpack/msgpack";

let websocket = null;
let max_client_id_num = 0;

function EventListener() {
  const handlers = new Map();

  return {
    on: (event, handler) => {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event).push(handler);
    },
    off: (event, handler) => {
      if (handlers.has(event)) {
        const handlers = handlers.get(event);
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    },
    emit: async (event, data) => {
      if (handlers.has(event)) {
        handlers.get(event).forEach(async handler => {
          try {
            await handler(data);
          } catch (err) {
            console.error(err);
          }
        });
      }
    },
  };
}

export function GenerateMessageID(length=20) {
  const hex = '0123456789abcdef';

  let ret = '';
  for(let i = 0; i < length; i++) {
    let num = Math.floor(Math.random() * 16);
    ret += hex[num];
  }

  return ret;
}

const global_events = EventListener();

export const GlobalEvents = { on: global_events.on, off: global_events.off };

export async function Connect() {
  if(websocket == null) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${paths.socket}`;

    let tmp_websocket = new WebSocket(wsUrl);
    tmp_websocket.binaryType = 'arraybuffer';

    return new Promise((resolve, reject) => {
      let error_ocurred = false;
      const open = async () => {
        if(error_ocurred) return;
        websocket = tmp_websocket;
        tmp_websocket.removeEventListener("open", open);
        resolve(true);
        await global_events.emit('open');
      }
      tmp_websocket.addEventListener("open", open)
      const close = async () => {
        websocket = null;
        tmp_websocket.removeEventListener("close", close);
        await global_events.emit('close');
      }
      tmp_websocket.addEventListener("close", close);
      const error = async (e) => {
        console.error("Websocket error:", e);
        if(!open) {
          error_ocurred = true;
          tmp_websocket.removeEventListener("open", open);
          tmp_websocket.removeEventListener("close", close);
          tmp_websocket.removeEventListener("error", error);
          websocket = null;
          reject(e)
          await global_events.emit('close');
        }
        await global_events.emit('error', e);
      }
      tmp_websocket.addEventListener("error", error);
    });
  } else {
    return true;
  }
}

export async function *StringIterator(str) {
  yield str
}

export class PipeCmdClient {
  constructor() {
    this.eventHandlers = new Map();
    this.clientID = `pipe-${++max_client_id_num}`;

    this.connected = false;

    this.on('connected', () => this.connected = true);
    this.on('disconnected', () => this.connected = false);

    this.command_running = false;

    this.on('command_running', () => this.command_running = true);
    this.on('command_finished', () => this.command_running = false);

    this.on('raw_message', (msg) => console.log('incoming: ', msg));
  }

  async connect() {
    const message = (event) => {
        try {
          const decoded = decode(new Uint8Array(event.data));
          if(decoded.client_id === this.clientID) {
            this.emit('raw_message', decoded);

            switch(decoded.message_type) {
              case 'output_stream':
                this.emit('output_stream', decoded.output_stream);
                break;
              case 'error_stream':
                this.emit('error_stream', decoded.error_stream);
                break;
              case 'connect_acknowledged':
                this.emit('connected');
                break;
              case 'disconnect_acknowledged':
                this.emit('disconnected');
                break;
              case 'open_stdin':
                this.emit('stream_open', 'stdin');
                break;
              case 'open_stdout':
                this.emit('stream_open', 'stdout');
                break;
              case 'open_stderr':
                this.emit('stream_open', 'stderr');
                break;
              case 'close_stdin':
                this.emit('stream_close', 'stdin');
                break;
              case 'close_stdout':
                this.emit('stream_close', 'stdout');
                break;
              case 'close_stderr':
                this.emit('stream_close', 'stderr');
                break;
              case 'command_running':
                this.emit('command_running');
                break;
              case 'command_finished':
                this.emit('command_finished', decoded.command_result);
                break;
              case 'err_response':
                this.emit('command_error', decoded.error);
                this.emit('error', 'Server sent error: ' + decoded.error);
                break;
            }
          }
        } catch (error) {
          console.error('Failed to decode message:', error);
          this.emit('error', error);
        }
    }
    const error = (error) => this.emit('error', error);
    const close = () => {
      this.emit('disconnected')
      websocket.removeEventListener('open', open);
      websocket.removeEventListener('message', message);
      websocket.removeEventListener('error', error);
      websocket.removeEventListener('close', close);
    }
    websocket.addEventListener('message', message);
    websocket.addEventListener('error', error);
    websocket.addEventListener('close', close);

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "connect",
    });

    await this.until('connected');
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  until(event, predicate=null) {
    return new Promise(resolve => {
      const listen = data => {
        if(predicate === null || predicate(data)) {
          this.off(event, listen)
          resolve(data);
        }
      }
      this.on(event, listen);
    });
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  send(message) {
    const encoded = encode(message);

    console.log('outgoing: ', message);

    this.sendRaw(encoded);
  }

  async run_command(command, input=StringIterator("")) {
    let command_result;
    let output = "";
    let error = "";

    const listen_stdout = (str) =>  (output += str);
    const listen_stderr = (str) => error += str;

    let stdin_open = false;
    let notify_stdin_open = () => null;
    const input_reader = (async () => {
      let stream_used = false;
      for await (const in_str of input) {
        if(!stdin_open)
          await new Promise(r => notify_stdin_open = r);
        if(this.command_running) {
          stream_used = true;
          this.send({
            message_id: GenerateMessageID(),
            client_id: this.clientID,

            message_type: "input_stream",
            input_stream: in_str,
          });
        }
      }

      if(this.command_running && stream_used)
        this.send({
          message_id: GenerateMessageID(),
          client_id: this.clientID,

          message_type: "stdin_eof",
        });
    })

    const input_promise = input_reader();

    const pipe_opener = (stream_name) => {
      switch(stream_name) {
        case 'stdin':
          stdin_open = true;
          notify_stdin_open();
          break;
      }
    }

    const pipe_closer = (stream_name) => {
      switch(stream_name) {
        case 'stdin':
          stdin_open = false;
          break;
      }
    }

    this.on('stream_open', pipe_opener);
    this.on('stream_close', pipe_closer);

    this.on('output_stream', listen_stdout);
    this.on('error_stream', listen_stderr);

    command_result = this.until('command_finished');

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "run_command",
      command: command,
    });

    command_result = await command_result;
    stdin_open = true;
    notify_stdin_open()
    this.command_running = false;
    await input_promise;

    this.off('stream_open', pipe_opener);
    this.off('stream_close', pipe_closer);

    this.off('output_stream', listen_stdout);
    this.off('error_stream', listen_stderr);

    return {
      command_result,
      output,
      error,
    };
  }

  sendRaw(data) {
    websocket.send(data);
  }

  async disconnect() {
    if(websocket != null) {
      this.send({
        message_id: GenerateMessageID(),
        client_id: this.clientID,

        message_type: "disconnect",
      });

      return await this.until('disconnected');
    }
  }
}
