import os
from sdn.southbound import SDNSouthboundDriver
from sdn.interfaces import SouthboundDriver


def get_southbound_driver() -> SouthboundDriver:
    driver_name = os.getenv('SDN_DRIVER', 'iptables')
    # For now only one concrete driver is present; extend here for others
    if driver_name == 'iptables' or driver_name == 'mock':
        return SDNSouthboundDriver()
    return SDNSouthboundDriver()


