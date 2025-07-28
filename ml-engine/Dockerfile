FROM python:3.12.3

RUN useradd -ms /bin/sh -u 1001 app

RUN mkdir /sockets && chown app:app /sockets
VOLUME /sockets

USER app

WORKDIR /app

COPY --chown=app:app requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .

USER root

ENV PYTHONPATH="/home/app/.local/lib/python3.12/site-packages"
CMD chown app:app /sockets && setpriv --reuid=1001 --regid=1001 --init-groups python3 server.py
