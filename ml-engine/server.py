import socket
import os
import json
from jsonrpc import JSONRPCResponseManager, dispatcher
from concurrent.futures import ThreadPoolExecutor
import threading
import handler_imports

SOCKET_PATH = os.getenv("SOCK_FILE") or "./test.sock"

executor = ThreadPoolExecutor(max_workers=4)
lock = threading.Lock()  # optional, for writing back in sync

# --- Handle a single connection (long-lived) ---
def handle_connection(conn):
    file = conn.makefile(mode='rwb')
    while True:
        line = file.readline()
        if not line:
            break
        try:
            message = line.decode('utf-8').strip()
            if not message:
                continue
            # Process in thread pool
            executor.submit(process_message, message, file)
        except Exception as e:
            print(f"Error reading line: {e}", flush=True)
            break

def process_message(message, file):
    try:
        response = JSONRPCResponseManager.handle(message, dispatcher)
        if response is not None:
            with lock:
                file.write((json.dumps(response.data) + '\n').encode('utf-8'))
                file.flush()
    except Exception as e:
        print(f"Error processing message: {e}", flush=True)

# --- Unix socket server ---
def run_server():
    if os.path.exists(SOCKET_PATH):
        os.remove(SOCKET_PATH)

    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as server_sock:
        server_sock.bind(SOCKET_PATH)
        server_sock.listen()
        print(f"Listening on {SOCKET_PATH}", flush=True)
        while True:
            conn, _ = server_sock.accept()
            threading.Thread(target=handle_connection, args=(conn,), daemon=True).start()

if __name__ == "__main__":
    run_server()
