#!/usr/bin/env python3
"""Simulates the SmartFlame ESP32 /api/status endpoint for app testing.

Also runs a WebSocket push server on port 81 (matching the real firmware's
WebSocketsServer) when the optional `websockets` package is installed:
    pip install websockets
Without it, the app just uses its HTTP-poll fallback.
Usage: python3 scripts/esp32-sim.py [--fire] [port]"""
import http.server, json, random, sys, threading, time

FIRE = "--fire" in sys.argv
PORT = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 8080
WS_PORT = 8081  # 81 needs root on Linux; app accepts any port via the ws URL

def status_payload():
    gas = random.randint(75, 95) if FIRE else random.randint(3, 15)
    return {
        "mq2Raw": gas * 30, "gasPercent": gas,
        "temperatureC": random.randint(28, 33), "humidity": random.randint(40, 60),
        "dhtValid": True, "flame": FIRE,
        "alert": "EMERGENCY" if FIRE else "NORMAL",
        "routerConnected": True, "wifiMode": "ROUTER",
    }

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/status"):
            body = json.dumps(status_payload()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>SmartFlame SIM</h1>")
        else:
            self.send_response(404); self.end_headers()
    def log_message(self, *a): pass

def start_ws_server():
    """Broadcast status JSON on ws://0.0.0.0:81 every 250 ms, like the board."""
    try:
        import asyncio, websockets  # optional dependency
    except ImportError:
        print("[SIM] websockets package not installed — app will use HTTP polling fallback")
        return
    clients = set()
    async def handler(ws):
        clients.add(ws)
        try:
            await ws.wait_closed()
        finally:
            clients.discard(ws)
    async def broadcaster():
        while True:
            if clients:
                msg = json.dumps(status_payload())
                await asyncio.gather(
                    *(c.send(msg) for c in list(clients)),
                    return_exceptions=True,
                )
            await asyncio.sleep(0.25)
    async def main():
        async with websockets.serve(handler, "0.0.0.0", WS_PORT):
            await broadcaster()
    loop = asyncio.new_event_loop()
    threading.Thread(target=loop.run_until_complete, args=(main(),), daemon=True).start()
    print(f"[SIM] WebSocket push on ws://0.0.0.0:{WS_PORT} (250 ms updates)")

start_ws_server()
print(f"SIM ESP32 on http://0.0.0.0:{PORT}/api/status  fire={FIRE}")
http.server.HTTPServer(("0.0.0.0", PORT), H).serve_forever()
