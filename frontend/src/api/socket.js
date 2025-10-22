import { parse, stringify } from "yaml";
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
    until(event, predicate = null) {
      return new Promise((resolve) => {
        const listen = (data) => {
          if (predicate === null || predicate(data)) {
            this.off(event, listen);
            resolve(data);
          }
        };
        this.on(event, listen);
      });
    },
  };
}

function makeAsyncQueue() {
  const values = [];
  const resolvers = [];
  let done = false;

  return {
    push(value) {
      if (done) return;
      if (resolvers.length) {
        // Someone is awaiting next() — resolve immediately
        const resolve = resolvers.shift();
        resolve({ value, done: false });
      } else {
        // No one is waiting — queue the value
        values.push(value);
      }
    },
    close() {
      done = true;
      while (resolvers.length)
        resolvers.shift()({ value: undefined, done: true });
    },
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (values.length) {
            return Promise.resolve({ value: values.shift(), done: false });
          }
          if (done) {
            return Promise.resolve({ value: undefined, done: true });
          }
          // Wait for a push
          return new Promise((resolve) => resolvers.push(resolve));
        },
      };
    },
  };
}

export function GenerateMessageID(length = 20) {
  const hex = "0123456789abcdef";

  let ret = "";
  for (let i = 0; i < length; i++) {
    let num = Math.floor(Math.random() * 16);
    ret += hex[num];
  }

  return ret;
}

const global_events = EventListener();

export const GlobalEvents = {
  on: global_events.on,
  off: global_events.off,
  until: global_events.until,
};

let connected = false;
GlobalEvents.on("open", () => (connected = true));
GlobalEvents.on("close", () => (connected = false));

export const IsConnected = () => connected;

let connecting = false;
export async function Connect() {
  if (websocket == null && !connecting) {
    connecting = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${paths.socket}`;

    let tmp_websocket = new WebSocket(wsUrl);
    tmp_websocket.binaryType = "arraybuffer";

    return new Promise((resolve, reject) => {
      let error_ocurred = false;
      const open = async () => {
        if (error_ocurred) return;
        websocket = tmp_websocket;
        connecting = false;
        tmp_websocket.removeEventListener("open", open);
        resolve(true);
        global_events.emit("open");
      };
      tmp_websocket.addEventListener("open", open);
      const close = async () => {
        websocket = null;
        connecting = false;
        tmp_websocket.removeEventListener("close", close);
        global_events.emit("close");
      };
      tmp_websocket.addEventListener("close", close);
      const error = async (e) => {
        console.error("Websocket error:", e);
        if (!connected) {
          error_ocurred = true;
          tmp_websocket.removeEventListener("open", open);
          tmp_websocket.removeEventListener("close", close);
          tmp_websocket.removeEventListener("error", error);
          websocket = null;
          connecting = false;
          reject(e);
          global_events.emit("close");
        }
        global_events.emit("error", e);
      };
      tmp_websocket.addEventListener("error", error);
    });
  } else {
    if (!connected) {
      return new Promise((r) => {
        const listen = () => {
          GlobalEvents.off("open", listen);
          r(true);
        };
        GlobalEvents.on("open", listen);
      });
    } else {
      return true;
    }
  }
}

GlobalEvents.on("open", () => console.log("Socket connected"));

export async function* StringIterator(str) {
  yield str;
}

export class PipeCmdClient {
  #handler = EventListener();

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

    this.on("connected", () => (this.connected = true));
    this.on("disconnected", () => (this.connected = false));

    this.command_running = false;

    this.on("command_running", () => (this.command_running = true));
    this.on("command_finished", () => (this.command_running = false));

    this.on("raw_message", (msg) =>
      console.log(`incoming [${this.clientID}]:`, msg)
    );

    Connect();

    console.log("client created: ", this.clientID);
  }

  #connecting = false;
  async connect() {
    if (this.connected) return;

    if (this.#connecting) return this.until("connected");

    this.#connecting = true;
    await Connect();
    const message = (event) => {
      try {
        const decoded = decode(new Uint8Array(event.data));
        if (decoded.client_id === this.clientID) {
          this.emit("raw_message", decoded);

          switch (decoded.message_type) {
            case "output_stream":
              this.emit("output_stream", decoded.output_stream);
              break;
            case "error_stream":
              this.emit("error_stream", decoded.error_stream);
              break;
            case "connect_acknowledged":
              this.emit("connected");
              break;
            case "disconnect_acknowledged":
              this.emit("disconnected");
              break;
            case "command_running":
              this.emit("command_running");
              break;
            case "command_finished":
              this.emit("command_finished", decoded.command_result);
              break;
            case "err_response":
              this.emit("command_error", decoded.error);
              this.emit("error", "Server sent error: " + decoded.error);
              break;
          }
        }
      } catch (error) {
        console.error("Failed to decode message:", error);
        this.emit("error", error);
      }
    };
    const error = (error) => this.emit("error", error);
    const close = () => {
      this.emit("disconnected");
      if (websocket) {
        websocket.removeEventListener("message", message);
        websocket.removeEventListener("error", error);
        websocket.removeEventListener("close", close);
      }
    };
    websocket.addEventListener("message", message);
    websocket.addEventListener("error", error);
    websocket.addEventListener("close", close);

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "connect",
    });

    await this.until("connected");
    this.#connecting = false;
  }

  send(message) {
    const encoded = encode(message);

    console.log(`outgoing [${this.clientID}]:`, message);

    this.sendRaw(encoded);
  }

  async run_command(command, input = StringIterator("")) {
    await Connect();
    if (this.command_running) await this.until("command_finished");
    this.command_running = true;

    let command_result;
    let output = "";
    let error = "";

    const listen_stdout = (str) => (output += str);
    const listen_stderr = (str) => (error += str);

    const input_reader = async () => {
      for await (const in_str of input) {
        if (this.command_running) {
          this.send({
            message_id: GenerateMessageID(),
            client_id: this.clientID,
            message_type: "input_stream",
          };

          if (in_data instanceof Uint8Array) {
            // Send as binary data (MessagePack will encode as bin type)
            message.input_stream = in_data;
          } else {
            // Send as string
            message.input_stream = in_data;
          }

          this.send(message);
        }
      }

      if (this.command_running)
        this.send({
          message_id: GenerateMessageID(),
          client_id: this.clientID,

          message_type: "stdin_eof",
        });
    };

    this.on("output_stream", listen_stdout);
    this.on("error_stream", listen_stderr);

    command_result = new Promise((resolve) => {
      const close_listener = (msg) => {
        if (msg.message_type === "command_finished") {
          this.off("raw_message", close_listener);
          resolve(msg.command_result);
        } else if (msg.message_type === "disconnected") {
          error = "error: client disconnected while command running";
          this.off("raw_message", close_listener);
          resolve(1);
        }
      };
      this.on("raw_message", close_listener);
    });

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "run_command",
      command: command,
    });

    await this.until("command_running");
    const input_promise = input_reader();
    command_result = await command_result;
    this.command_running = false;
    await input_promise;

    this.off("output_stream", listen_stdout);
    this.off("error_stream", listen_stderr);

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
    if (this.connected) {
      const disconnect = this.until("disconnected");
      this.send({
        message_id: GenerateMessageID(),
        client_id: this.clientID,

        message_type: "disconnect",
      });
      return await disconnect;
    } else if (this.#connecting) {
      await this.until("connected");
      return await this.disconnect();
    }
  }

  async whoami() {
    const cmd = await this.run_command("whoami");

    if (cmd.command_result != 0) {
      throw new Error(cmd.error);
    }

    return parse(cmd.output);
  }

  // ls gets the files in the specified directory, defaulting to current if not provided.
  // Example output:
  // [
  //  {
  //    "file_count":1, // 1 for files, entry-count for directories
  //    "file_size":97, // in bytes
  //    "modified_time": new Date("Sep 30 12:47 2025"),
  //    "name":"user.profile",
  //    "permissions":{
  //      "read_tags":["sysadmin","user-CogniAdmin","user"],
  //       "write_tags":["sysadmin","user-CogniAdmin","user"],
  //       "execute_tags":["sysadmin","user-CogniAdmin","user"],
  //       "updatetag_tags":["sysadmin","user-CogniAdmin","user"]
  //    },
  //    "type":"file" // "file" or "directory"
  //  },
  // ]
  async ls(dir = ".") {
    const cmd = await this.run_command(`ls -yl -- ${dir}`);

    if (cmd.command_result != 0) {
      throw new Error(cmd.error);
    }

    if (cmd.output.length === 0) {
      return [];
    }
    const list = parse(cmd.output);
    list.forEach((file) => {
      file.modified_time = new Date(file.modified_time);
    });

    return list;
  }

  // get_pilots gets a list of all the pilots on the system.
  // If verbose=true (which is the default), get_pilots also fetches all their user profiles.
  // Depending on which information the pilot has already provided, it could look like this:
  // [
  //  {
  //    "username": "Jeremia",
  //    "email": "jeremia@exequtech.com",
  //    "phone": "123456789",
  //    "license_expiry_date": "2025-10-29",
  //    "license_number": "Jn123",
  //    "name": "Jeremia",
  //    "surname": "Fourie",
  //    "total_flight_hours": 10,
  //    "role": "pilot",
  //    "cabin_preferences": {
  //      "preferred_temperature_celsius": 25,
  //      "temperature_tolerance_range_celsius": 2
  //    },
  //    "cardiovascular_baselines": {
  //      "resting_heart_rate_bpm": 70,
  //      "resting_heart_rate_std_dev": 2,
  //      "max_heart_rate_bpm": 100
  //    },
  //    "ocular_baselines": {
  //      "baseline_blink_rate_per_minute": 12,
  //      "baseline_blink_duration_ms": 100
  //    }
  //  }
  // ]
  // For more info, check out settings and the user.profile file for a pilot
  async get_pilots(verbose = true) {
    const cmd = await this.run_command("pilots");

    if (cmd.command_result != 0) {
      throw new Error(cmd.error);
    }

    if (cmd.output.length === 0) {
      return [];
    }

    const pilots = cmd.output.split("\r\n");
    if (!verbose) {
      return pilots.filter((s) => s != "");
    }

    const ret = [];
    for (let pilot of pilots) {
      if (pilot === "") continue;
      const cmd = await this.run_command(`cat /home/${pilot}/user.profile`);

      if (cmd.command_result != 0) {
        throw new Error(cmd.error);
      }

      ret.push({ username: pilot, ...parse(cmd.output) });
    }

    return ret;
  }

  // get_users gets a list of all the users on the system.
  // If verbose=true (which is the default), get_users also fetches all their user profiles.
  // In the event that a user's user.profile file is missing, that field is explicitly set to null.
  // The contents of the user.profile file highly depend on the person's role and whether they set up their settings things already.
  //
  // Here's a preview of what it could look like:
  // [
  //  {
  //    "username": "FionaLawrence",
  //    "tags": [ "pilot", "user", "user-FionaLawrence", "pilot", "user" ] // apologies, we have a backend double-tagging bug on signup at the moment I'm writing this
  //    user_profile: {
  //      "email": "fiona.lawrence@vectra-aviation.com",
  //      "phone": 749991212,
  //      "name": "Fiona",
  //      "surname": "Lawrence",
  //      "role": "pilot",
  //      "total_flight_hours": 75,
  //      "cabin_preferences": {
  //        "preferred_temperature_celsius": 24,
  //        "temperature_tolerance_range_celsius": 2
  //      },
  //      "cardiovascular_baselines": {
  //        "resting_heart_rate_bpm": 62,
  //        "resting_heart_rate_std_dev": 1.8,
  //        "max_heart_rate_bpm": 170
  //      },
  //      "ocular_baselines": {
  //        "baseline_blink_rate_per_minute": 12,
  //        "baseline_blink_duration_ms": 100
  //      }
  //    }
  //  }
  // ]
  async get_users(verbose = true) {
    const passwd_files = await this.ls("/etc/passwd");
    const home_folders = await this.ls("/home");

    const users = [];
    for (const file of passwd_files) {
      if (file.name.endsWith(".login")) {
        users.push(file.name.substring(0, file.name.length - ".login".length));
      }
    }
    for (const file of home_folders) {
      if (!users.includes(file.name))
        users.push(file.name);
    }

    if (!verbose) {
      return users;
    }

    const ret = [];
    for (let user of users) {
      const fields = { username: user, user_profile: null, tags: null };
      const user_profile_cmd = await this.run_command(
        `cat "/home/${user}/user.profile"`
      );

      if (user_profile_cmd.command_result != 0) {
        if (!user_profile_cmd.error.includes("file does not exist")) {
          throw new Error(user_profile_cmd.error);
        }
      } else {
        fields.user_profile = parse(user_profile_cmd.output);
      }

      const login_file_cmd = await this.run_command(
        `cat "/etc/passwd/${user}.login"`
      );

      if (login_file_cmd.command_result != 0) {
        if (!login_file_cmd.error.includes("file does not exist")) {
          throw new Error(login_file_cmd.error);
        }
      } else {
        fields.tags = parse(login_file_cmd.output);
      }

      ret.push(fields);
    }

    return ret;
  }

  // create_invite creates a signup file for the given information. role is expected to have one of the following values:
  // "sysadmin", "atc", "pilot", "edge-node"
  // Anything that is provided in "info" will also be put in the signup file.
  // Practically, that's contact info, either {email: "example@gmail.com"} or {phone: "123456789"}
  async create_invite(role, info) {
    const presets = {
      sysadmin: {
        tags: ["sysadmin", "user"],
        role: "sysadmin",
      },
      atc: {
        tags: ["atc", "user"],
        role: "atc",
      },
      pilot: {
        tags: ["pilot", "user"],
        role: "pilot",
        home_permissions: {
          "read_tags": ["sysadmin", "atc", "edge-node"],
          "write_tags": ["sysadmin"],
          "execute_tags": ["sysadmin", "atc", "edge-node"],
          "updatetag_tags": ["sysadmin"],
        },
      },
      "edge-node": {
        tags: ["edge-node", "user"],
        role: "edge-node",
        home_permissions: {
          "read_tags": ["sysadmin", "atc"],
          "write_tags": ["sysadmin"],
          "execute_tags": ["sysadmin", "atc"],
          "updatetag_tags": ["sysadmin"],
        },
      },
    };

    const tok_cmd = await this.run_command("crypto-rand -f b64 32");
    if (tok_cmd.command_result != 0) {
      throw new Error(tok_cmd.error);
    }

    const tok_str = tok_cmd.output;

    const signupfile_str = stringify({ ...info, ...presets[role] }).replace(
      /\n/g,
      "\r\n"
    );

    const tee_cmd = await this.run_command(
      `tee /etc/passwd/${tok_str}.signup`,
      StringIterator(signupfile_str)
    );
    if (tee_cmd.command_result != 0) {
      throw new Error(tee_cmd.error);
    }

    return tok_str;
  }

  // update_login_file updates the fields provided in new_fields to new values.
  // For example, you could run update_login_file("username", {tags: ["user"]}) to set "username"'s tags to ["user"]
  async update_login_file(username, new_fields = {}) {
    const cat_cmd = await this.run_command(`cat /etc/passwd/${username}.login`);
    if(cat_cmd.command_result != 0) {
      throw new Error(cat_cmd.error);
    }

    const current_fields = parse(cat_cmd.output);
    
    const new_login_file = {...current_fields, ...new_fields};
    const new_file = stringify(new_login_file).replace(
      /\n/g,
      "\r\n"
    );

    const tee_cmd = await this.run_command(`tee /etc/passwd/${username}.login`, StringIterator(new_file));
    if(tee_cmd.command_result != 0) {
      throw new Error(tee_cmd.error);
    }

    return new_login_file
  }
}

export class StreamCmdClient {
  #handler = EventListener();

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
    this.clientID = `term-${++max_client_id_num}`;

    this.connected = false;

    this.on("connected", () => (this.connected = true));
    this.on("disconnected", () => (this.connected = false));

    this.command_running = false;

    this.on("command_running", () => (this.command_running = true));
    this.on("command_finished", () => (this.command_running = false));

    this.on("raw_message", (msg) =>
      console.log(`incoming [${this.clientID}]:`, msg)
    );

    Connect();

    console.log("client created: ", this.clientID);
  }

  #connecting = false;
  async connect() {
    if (this.connected) return;
    if (this.#connecting) return this.until("connected");

    this.#connecting = true;
    await Connect();
    const message = (event) => {
      try {
        const decoded = decode(new Uint8Array(event.data));
        if (decoded.client_id === this.clientID) {
          this.emit("raw_message", decoded);

          switch (decoded.message_type) {
            case "output_stream":
              this.emit("output_stream", decoded.output_stream);
              break;
            case "error_stream":
              this.emit("error_stream", decoded.error_stream);
              break;
            case "connect_acknowledged":
              this.emit("connected");
              break;
            case "disconnect_acknowledged":
              this.emit("disconnected");
              break;
            case "command_running":
              this.emit("command_running");
              break;
            case "command_finished":
              this.emit("command_finished", decoded.command_result);
              break;
            case "err_response":
              this.emit("command_error", decoded.error);
              this.emit("error", "Server sent error: " + decoded.error);
              break;
          }
        }
      } catch (error) {
        console.error("Failed to decode message:", error);
        this.emit("error", error);
      }
    };
    const error = (error) => this.emit("error", error);
    const close = () => {
      this.emit("disconnected");
      if (websocket) {
        websocket.removeEventListener("message", message);
        websocket.removeEventListener("error", error);
        websocket.removeEventListener("close", close);
      }
    };
    websocket.addEventListener("message", message);
    websocket.addEventListener("error", error);
    websocket.addEventListener("close", close);

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "connect",
    });

    await this.until("connected");
    this.#connecting = false;
  }

  send(message) {
    const encoded = encode(message);
    console.log(`outgoing [${this.clientID}]:`, message);
    websocket.send(encoded);
  }

  async run_command(command) {
    await Connect();
    if (this.command_running) await this.until("command_finished");
    this.command_running = true;

    this.send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "run_command",
      command: command,
    });

    await this.until("command_running");

    return new CommandHandle(this);
  }

  async disconnect() {
    if (this.connected) {
      const disconnect = this.until("disconnected");
      this.send({
        message_id: GenerateMessageID(),
        client_id: this.clientID,

        message_type: "disconnect",
      });
      return await disconnect;
    } else if (this.#connecting) {
      await this.until("connected");
      return await this.disconnect();
    }
  }
}

class CommandHandle {
  #handler = EventListener();

  on(event, handler) {
    return this.#handler.on(event, handler);
  }

  off(event, handler) {
    return this.#handler.off(event, handler);
  }

  until(event, predicate) {
    return this.#handler.until(event, predicate);
  }

  #send = null;
  constructor(client) {
    this.#send = client.send;
    this.clientID = client.clientID;
    this.command_running = true;
    this.command_result = null;
    this.outputStr = "";
    this.errorStr = "";
    this.input_is_eof = false;

    client.on("command_finished", (result) => {
      this.command_result = result;
      this.command_running = false;
      this.#handler.emit("command_finished", result);
    });

    client.on("disconnected", () => {
      this.command_running = false;
      this.#handler.emit("command_finished", result);
      this.#handler.emit("disconnected");
    });

    client.on("output_stream", (str) => {
      this.outputStr += str;
      this.#handler.emit("output_stream", str);
    });

    client.on("error_stream", (str) => {
      this.errorStr += str;
      this.#handler.emit("error_stream", str);
    });
  }

  input(str) {
    if (!this.command_running) throw new Error("Command not running");
    if (this.input_is_eof) throw new Error("Stdin already EOF");
    this.#send({
      message_id: GenerateMessageID(),
      client_id: this.clientID,

      message_type: "input_stream",
      input_stream: str,
    });
  }

  input_eof() {
    if (!this.command_running) throw new Error("Command not running");
    if (!this.input_is_eof) {
      this.#send({
        message_id: GenerateMessageID(),
        client_id: this.clientID,

        message_type: "stdin_eof",
      });
      this.input_is_eof = true;
    }
  }

  async *iter_output() {
    if (!this.command_running) throw new Error("Command not running");
    const queue = makeAsyncQueue();
    queue.push(this.outputStr);
    const push = (str) => queue.push(str);
    const finish = () => {
      this.off("output_stream", push);
      this.off("command_finished", finish);
      queue.close();
    };
    this.on("output_stream", push);
    this.on("command_finished", finish);

    for await (const chunk of queue) yield chunk;
  }

  async *iter_error() {
    if (!this.command_running) throw new Error("Command not running");
    const queue = makeAsyncQueue();
    queue.push(this.errorStr);
    const push = (str) => queue.push(str);
    const finish = () => {
      this.off("error_stream", push);
      this.off("command_finished", finish);
      queue.close();
    };
    this.on("error_stream", push);
    this.on("command_finished", finish);

    for await (const chunk of queue) yield chunk;
  }

  async *iter_yaml_output() {
    if(!this.command_running)
      throw new Error("Command not running");
    function ProcessBuffer(buffer) {
      const lines = buffer.split('\r\n');
      let temp_buf = "";
      const ret = [];
      while(lines.length > 0) {
        const line = lines.shift();
        if(line === "---") {
          ret.push(parse(temp_buf));
          temp_buf = "";
        } else {
          temp_buf += "\r\n" + line;
        }
      }

      return [ret, temp_buf.substring(1)];
    }

    let buffer = "";

    for await (const chunk of this.iter_output()) {
      buffer += chunk;

      const [documents, leftover] = ProcessBuffer(buffer);
      buffer = leftover;
      for(const doc of documents) {
        yield doc
      }
    }

    let temp_buf = "";
    const lines = buffer.split('\r\n');
    for(const line of lines) {
      if(line === "---") {
        yield parse(temp_buf)
        temp_buf = "";
      } else {
        temp_buf += '\r\n' + line;
      }
    }
    if(temp_buf.trim().length > 0)
      yield parse(temp_buf)
  }

  async result() {
    if (this.command_result !== null) return this.command_result;
    else return await this.until("command_finished");
  }
}

export function usePipeClient() {
  const [client, setClient] = useState(null);
  useEffect(() => {
    const client_instance = new PipeCmdClient();

    client_instance.connect();
    setClient(client_instance);

    return () =>
      client_instance.disconnect().catch((err) => console.error(err));
  }, []);

  return client;
}

export function useStreamClient() {
  const [client, setClient] = useState(null);
  useEffect(() => {
    const client_instance = new StreamCmdClient();

    client_instance.connect();
    setClient(client_instance);

    return () =>
      client_instance.disconnect().catch((err) => console.error(err));
  }, []);

  return client;
}
