from abc import ABC, abstractmethod


class SouthboundDriver(ABC):
    @abstractmethod
    def block_mac(self, mac_colon_lower: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def allow_mac_on_vlan(self, mac_colon_lower: str, vlan_id: int) -> bool:
        raise NotImplementedError


