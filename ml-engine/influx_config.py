import os

from dotenv import load_dotenv
load_dotenv()

url = os.getenv('INFLUX_URL') or 'http://localhost:8086'
token = os.getenv('INFLUX_TOKEN') or ''
org = os.getenv('INFLUX_ORG') or 'cogniflight'
bucket = os.getenv('INFLUX_BUCKET') or 'telegraf'
measurement = os.getenv('MEASUREMENT') or 'cloud_synthetic'
pilot_id = os.getenv('PILOT_ID') or 'P001'
