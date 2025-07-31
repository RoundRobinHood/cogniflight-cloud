from jsonrpc import dispatcher
import time

@dispatcher.add_method
def add(a, b):
    return a + b

@dispatcher.add_method
def multiply(a, b):
    return a * b

@dispatcher.add_method
def sleep_echo(message, duration):
    time.sleep(duration)
    return message

