import http.server
import socketserver
import socket
import webbrowser
import os
import sys

PORT = 8000

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for easy development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()

    # Find open port
    port = PORT
    for p in range(PORT, PORT + 20):
        try:
            with socketserver.TCPServer(("", p), CustomHandler) as httpd:
                print("=" * 65)
                print(" ST. ANN'S COLLEGE FOR WOMEN - FACULTY FEEDBACK SERVER")
                print("=" * 65)
                print(f" [PC Access]     : http://localhost:{p}")
                print(f" [Mobile / WiFi] : http://{local_ip}:{p}")
                print(f" [Admin Portal]  : http://localhost:{p}/admin.html")
                print("=" * 65)
                print(" Press Ctrl+C to stop the server.")
                print(" Opening browser now...\n")
                
                webbrowser.open(f"http://localhost:{p}")
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
