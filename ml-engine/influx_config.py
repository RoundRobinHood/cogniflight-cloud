import os

url = os.getenv('INFLUX_URL') or 'http://localhost:8086'
token = os.getenv('INFLUX_TOKEN') or ''
org = os.getenv('INFLUX_ORG') or 'cogniflight'
bucket = os.getenv('INFLUX_BUCKET') or 'telegraf'
