"""Local website preview with HTTP byte-range support for video seeking.

Run from this folder with: python preview_server.py
"""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import re


class RangeHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        requested = self.headers.get("Range")
        if not requested:
            self.byte_range = None
            return super().send_head()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            self.byte_range = None
            return super().send_head()

        match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
        if not match or not any(match.groups()):
            self.send_error(400, "Invalid byte range")
            return None

        file = open(path, "rb")
        size = os.fstat(file.fileno()).st_size
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
        else:
            count = int(last)
            start = max(size - count, 0)
            end = size - 1

        if start > end or start >= size:
            file.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None

        self.byte_range = (start, end)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Last-Modified", self.date_time_string(os.fstat(file.fileno()).st_mtime))
        self.end_headers()
        return file

    def copyfile(self, source, outputfile):
        if self.byte_range is None:
            return super().copyfile(source, outputfile)
        start, end = self.byte_range
        source.seek(start)
        remaining = end - start + 1
        while remaining:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == "__main__":
    folder = Path(__file__).resolve().parent
    handler = partial(RangeHandler, directory=str(folder))
    with ThreadingHTTPServer(("127.0.0.1", 4173), handler) as server:
        print("Preview: http://127.0.0.1:4173/index.html", flush=True)
        server.serve_forever()
