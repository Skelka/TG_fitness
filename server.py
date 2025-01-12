from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

httpd = HTTPServer(('localhost', 8000), CORSRequestHandler)
print("Сервер запущен на http://localhost:8000")
httpd.serve_forever() 