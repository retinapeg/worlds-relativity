"""Python standard-library LOCAL static server. Never serves the repository root."""
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import errno
import sys

root = Path(sys.argv[1]).resolve()
if not (root/'index.html').is_file() or not (root/'wasm/relativity.wasm').is_file():
    raise SystemExit('No built demo here. Recovery: ./scripts/build.sh && ./run_demo.sh')
if any(p.is_symlink() for p in root.rglob('*')):
    raise SystemExit('Refusing to serve a directory containing symlinks.')
port = 8000
while True:
    try:
        server = HTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(root)))
        break
    except OSError as error:
        if error.errno != errno.EADDRINUSE or port >= 8099:
            raise
        port += 1
print(f'RELATIVITY DRIVE: http://127.0.0.1:{port}\nServing only: {root}\nStop: Ctrl-C', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
