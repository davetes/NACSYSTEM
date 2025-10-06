import os
import shutil
import subprocess
from typing import List

from utils.logging import log
from sdn.interfaces import SouthboundDriver


class SDNSouthboundDriver(SouthboundDriver):
    """Southbound interface abstracting network device rule management.

    This default implementation uses local iptables commands as a stand-in
    for programming a data plane. Replace with real switch/controller APIs
    (OpenFlow, NETCONF, gNMI, vendor SDKs) as needed.
    """

    def __init__(self) -> None:
        # Enable mock mode automatically on Windows or when iptables not found
        self.mock_mode = (
            os.name == 'nt' or shutil.which('iptables') is None or os.getenv('SDN_MOCK') == '1'
        )

    def _run_commands(self, commands: List[List[str]]) -> bool:
        if self.mock_mode:
            for cmd in commands:
                log(f"southbound-mock: would run cmd={' '.join(cmd)}")
            return True
        rule_applied = False
        for cmd in commands:
            try:
                subprocess.run(cmd, capture_output=True, text=True, check=True)
                log(f"southbound: applied cmd={' '.join(cmd)}")
                rule_applied = True
            except subprocess.CalledProcessError as error:
                log(f"southbound: failed cmd={' '.join(cmd)} stderr={error.stderr}")
        return rule_applied

    def block_mac(self, mac_colon_lower: str) -> bool:
        """Block a MAC at the host firewall (simulated data plane)."""
        commands = [
            ["iptables", "-A", "INPUT", "-m", "mac", "--mac-source", mac_colon_lower, "-j", "DROP"],
            ["iptables", "-A", "FORWARD", "-m", "mac", "--mac-source", mac_colon_lower, "-j", "DROP"],
        ]
        return self._run_commands(commands)

    def allow_mac_on_vlan(self, mac_colon_lower: str, vlan_id: int) -> bool:
        """Placeholder for allowing a MAC on a specific VLAN.

        In a real SDN environment, this would push flow entries or port/VLAN
        membership to the data plane via OpenFlow or device APIs.
        """
        log(f"southbound: allow mac={mac_colon_lower} vlan={vlan_id} (noop)")
        return True

# Provide a module-level singleton for convenience
driver = SDNSouthboundDriver()



class SDNNorthboundInterface:
    """Northbound Interface (NBI) exposing coarse-grained intent APIs.

    Note: In a full architecture, the NBI typically lives in the control plane
    and is exposed over REST/RPC to external apps. Here we provide a minimal
    in-process NBI that delegates to the southbound driver for simplicity.
    """

    def __init__(self, driver: SouthboundDriver) -> None:
        self._driver = driver

    def quarantine_mac(self, mac_colon_lower: str) -> bool:
        """High-level intent: quarantine a device by MAC.

        Current implementation maps directly to a MAC block at the data plane.
        """
        log(f"nbi: quarantine mac={mac_colon_lower}")
        return self._driver.block_mac(mac_colon_lower)

    def permit_mac_on_vlan(self, mac_colon_lower: str, vlan_id: int) -> bool:
        """High-level intent: allow a device on a specific VLAN."""
        log(f"nbi: permit mac={mac_colon_lower} vlan={vlan_id}")
        return self._driver.allow_mac_on_vlan(mac_colon_lower, vlan_id)


# Module-level NBI singleton for convenience
nbi = SDNNorthboundInterface(driver)
