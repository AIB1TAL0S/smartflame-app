#!/usr/bin/env python3
"""Simulates the SmartFlame ESP32 /api/status endpoint for app testing.
Usage: python3 scripts/esp32-sim.py [--fire] [port]"""
import http.server, json, random, sys, time

FIRE = "--fire" in sys.argv
PORT = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 8080

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/status"):
            gas = random.randint(75, 95) if FIRE else random.randint(3, 15)
            body = json.dumps({
                "mq2Raw": gas * 30, "gasPercent": gas,
                "temperatureC": random.randint(28, 33), "humidity": random.randint(40, 60),
                "dhtValid": True, "flame": FIRE,
                "alert": "EMERGENCY" if FIRE else "NORMAL",
                "routerConnected": True, "wifiMode": "ROUTER",
            }).encode()
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

print(f"SIM ESP32 on http://0.0.0.0:{PORT}/api/status  fire={FIRE}")
http.server.HTTPServer(("0.0.0.0", PORT), H).serve_forever()
