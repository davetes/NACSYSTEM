import os
import json
from typing import Tuple
from pymongo import MongoClient, ASCENDING


def get_mongo_client() -> MongoClient:
    uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    return MongoClient(uri)


def get_db_and_collections():
    client = get_mongo_client()
    db_name = os.getenv('MONGODB_DB', 'nacdb')
    db = client[db_name]
    devices = db['devices']
    vlan_profiles = db['vlan_profiles']
    return db, devices, vlan_profiles


def init_mongo_with_seed() -> None:
    _, devices, vlan_profiles = get_db_and_collections()
    devices.create_index([('mac', ASCENDING)], unique=True)
    vlan_profiles.create_index([('username', ASCENDING)], unique=True)

    # Seed from JSON if collections are empty
    if devices.estimated_document_count() == 0:
        devices_json = os.path.join(os.path.dirname(__file__), '../../data/devices.json')
        if os.path.exists(devices_json):
            with open(devices_json, 'r') as f:
                data = json.load(f)
                docs = []
                for dev in data:
                    docs.append({
                        'mac': dev.get('mac'),
                        'username': dev.get('name') or dev.get('username'),
                        'authorized': dev.get('authorized', True),
                        'vlan': dev.get('vlan')
                    })
                if docs:
                    devices.insert_many(docs)

    if vlan_profiles.estimated_document_count() == 0:
        vlan_json = os.path.join(os.path.dirname(__file__), '../../data/vlan_profiles.json')
        if os.path.exists(vlan_json):
            with open(vlan_json, 'r') as f:
                profiles = json.load(f)
                docs = [{'username': u, 'vlan': v} for u, v in profiles.items()]
                if docs:
                    vlan_profiles.insert_many(docs)


