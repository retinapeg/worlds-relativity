"""Serve only built, local runtime assets. No installation, compilation or internet."""
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import errno

parser = argparse.ArgumentParser()
parser.add_argument('directory')
parser.add_argument('--port', type=int, default=4173)
args = parser.parse_args()
root = Path(args.directory).resolve()
if not (root / 'index.html').is_file() or not (root / 'assets').is_dir():
    raise SystemExit('No built app here. Run ./scripts/npm.sh run build first.')
if any(path.is_symlink() for path in root.rglob('*')):
    raise SystemExit('Refusing to serve a directory containing symlinks.')


class LocalHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # This also proves the runtime works when ALL external requests are blocked.
        self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'none'; "
                         "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                         "object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, *_):
        pass


for port in range(args.port, args.port + 20):
    try:
        server = HTTPServer(('127.0.0.1', port), partial(LocalHandler, directory=str(root)))
        break
    except OSError as error:
        if error.errno != errno.EADDRINUSE or port == args.port + 19:
            raise
print(f'Relativity Drive: http://127.0.0.1:{port}\nServing {root}\nStop with Ctrl-C.', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
