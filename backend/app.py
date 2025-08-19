from flask import Flask, jsonify
from flask_cors import CORS
import os

import nac_controller as controller


def create_app() -> Flask:
	app = Flask(__name__)
	CORS(app)

	@ app.route("/devices", methods=["GET"])
	def get_devices():
		devices = controller.list_authorized_devices()
		return jsonify(devices), 200

	@ app.route("/logs", methods=["GET"])
	def get_logs():
		log_file_path = os.path.join("logs", "nac.log")
		if not os.path.exists(log_file_path):
			return jsonify({"logs": []}), 200
		with open(log_file_path, "r", encoding="utf-8") as log_file:
			lines = [line.rstrip("\n") for line in log_file.readlines()]
		return jsonify({"logs": lines}), 200

	@ app.route("/validate/<mac>", methods=["GET"])
	def validate_mac(mac: str):
		try:
			# Use the new API that returns username and VLAN
			result = controller.validate_and_assign(mac)
			return jsonify(result), 200
		except ValueError as exc:
			return jsonify({"error": str(exc)}), 400

	return app


if __name__ == "__main__":
	app = create_app()
	app.run(host="0.0.0.0", port=5000, debug=True)

