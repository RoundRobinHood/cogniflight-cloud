import { parse } from "yaml";
import paths from "./paths";
import { encode, decode } from "@msgpack/msgpack";
import { useState } from "react";
import { useEffect } from "react";

let websocket = null;
let max_client_id_num = 0;

function EventListener() {
  const handlers = new Map();

  return {
    on(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event).push(handler);
    },
    off(event, handler) {
      if (handlers.has(event)) {
        const listeners = handlers.get(event);
        const index = listeners.indexOf(handler);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    },
    emit(event, data) {
      const listeners = handlers.get(event);
      if (!listeners) return;
      for (const handler of [...listeners]) {
        try {
          handler(data);
        } catch (err) {
          console.error(err);
        }
      }
    },
    until(event, predicate=null) {
      return new Promise(resolve => {
        const listen = data => {
          if(predicate === null || predicate(data)) {
            this.off(event, listen);
            resolve(data);
          }
        }
        this.on(event, listen);
      })
    }
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

export const GlobalEvents = { on: global_events.on, off: global_events.off, until: global_events.until };

let connected = false;
GlobalEvents.on('open', () => connected = true);
GlobalEvents.on('close', () => connected = false);

export const IsConnected = () => connected;

let connecting = false;
export async function Connect() {
  if(websocket == null && !connecting) {
    connecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${paths.socket}`;

    let tmp_websocket = new WebSocket(wsUrl);
    tmp_websocket.binaryType = 'arraybuffer';

    return new Promise((resolve, reject) => {
      let error_ocurred = false;
      const open = async () => {
        if(error_ocurred) return;
        websocket = tmp_websocket;
        connecting = false;
        tmp_websocket.removeEventListener("open", open);
        resolve(true);
        global_events.emit('open');
      }
      tmp_websocket.addEventListener("open", open)
      const close = async () => {
        websocket = null;
        connecting = false;
        tmp_websocket.removeEventListener("close", close);
        global_events.emit('close');
      }
      tmp_websocket.addEventListener("close", close);
      const error = async (e) => {
        console.error("Websocket error:", e);
        if(!connected) {
          error_ocurred = true;
          tmp_websocket.removeEventListener("open", open);
          tmp_websocket.removeEventListener("close", close);
          tmp_websocket.removeEventListener("error", error);
          websocket = null;
          connecting = false;
          reject(e)
          global_events.emit('close');
        }
        global_events.emit('error', e);
      }
      tmp_websocket.addEventListener("error", error);
    });
  } else {
    if (!connected) {
      return new Promise(r => {
        const listen = () => {
          GlobalEvents.off('open', listen);
          r(true);
        }
        GlobalEvents.on('open', listen);
      });
    } else {
      return true;
    }
  }
}

GlobalEvents.on('open', () => console.log('Socket connected'));

export async function *StringIterator(str) {
  yield str
}

export class PipeCmdClient {
  #handler = EventListener()

  on(event, handler) {
    return this.#handler.on(event, handler);
  }

  off(event, handler) {
    return this.#handler.off(event, handler);
  }

  until(event, predicate) {
    return this.#handler.until(event, predicate);
  }

  emit(event, data) {
    return this.#handler.emit(event, data);
  }

  constructor() {
    this.eventHandlers = new Map();
    this.clientID = `pipe-${++max_client_id_num}`;

    this.connected = false;

    this.on('connected', () => this.connected = true);
    this.on('disconnected', () => this.connected = false);

    this.command_running = false;

    this.on('command_running', () => this.command_running = true);
    this.on('command_finished', () => this.command_running = false);

    this.on('raw_message', (msg) => console.log(`incoming [${this.clientID}]:`, msg));

    Connect();

    console.log('client created: ', this.clientID);
  }

  #connecting = false;
  async connect() {
    if(this.connected) return;

    if(this.#connecting) return this.until('connected');

    this.#connecting = true;
    await Connect();
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
      if (websocket) {
        websocket.removeEventListener('open', open);
        websocket.removeEventListener('message', message);
        websocket.removeEventListener('error', error);
        websocket.removeEventListener('close', close);
      }
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
    this.#connecting = false;
  }

  send(message) {
    const encoded = encode(message);

    console.log(`outgoing [${this.clientID}]:`, message);

    this.sendRaw(encoded);
  }

  async run_command(command, input=StringIterator("")) {
    await Connect();
    if (this.command_running) throw new Error("command already running")

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

    command_result = new Promise((resolve) => {
      const close_listener = msg => {
        if(msg.message_type === 'command_finished')
        {
          this.off('raw_message', close_listener)
          resolve(msg.command_result);
        } else if(msg.message_type === 'disconnected') {
          error = "error: client disconnected while command running";
          this.off('raw_message', close_listener)
          resolve(1);
        }
      }
      this.on('raw_message', close_listener);
    });

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
    if(this.connected) {
      const disconnect = this.until('disconnected');
      this.send({
        message_id: GenerateMessageID(),
        client_id: this.clientID,

        message_type: "disconnect"
      })
      return await disconnect;
    } else if (this.#connecting) {
      await this.until('connected');
      return await this.disconnect();
    }
  }

  async whoami() {
    const cmd = await this.run_command("whoami");

    if(cmd.command_result != 0) {
      throw new Error(cmd.error);
    }

    return parse(cmd.output);
  }
}

export function usePipeClient() {
  const [client, setClient] = useState(null);
  useEffect(() => {
    const client_instance = new PipeCmdClient();

    client_instance.connect();
    setClient(client_instance);

    return () => client_instance.disconnect().catch(err => console.error(err));
  }, []);

  return client;
}
