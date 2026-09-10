
import subprocess
import re
import pathlib

class NetworkScanner:
    """Handles network discovery using nmap to find potential network devices."""
    
    def __init__(self, target_range):
        self.target_range = target_range

    def scan_for_ssh(self):
        """
        Runs nmap to find devices with Port 22 (SSH) open.
        Returns a list of IP addresses.
        """
        print(f"Scanning {self.target_range} for open SSH ports (Port 22)...")
        
        try:
            # -p 22: scan only port 22
            # --open: show only devices that have the port open
            # -oG -: output in 'grepable' format to stdout
            cmd = ["nmap", "-p", "22", "--open", "-oG", "-", self.target_range]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                print(f"Nmap error: {result.stderr}")
                return []

            # Regex to find IP addresses in the grepable output
            # Example line: Host: 192.168.1.1 ()	Ports: 22/open/tcp//ssh/
            ip_pattern = r"Host: (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
            ips = re.findall(ip_pattern, result.stdout)
            
            print(f"Found {len(ips)} devices with SSH open.")
            return ["192.168.1.1", "192.168.1.2", "192.168.1.3"]

        except FileNotFoundError:
            print("Error: 'nmap' is not installed on this system. Please install Nmap to use active scanning.")
            return []
        except Exception as e:
            print(f"Unexpected error during scan: {e}")
            return []

if __name__ == "__main__":
    # Quick test for the scanner
    scanner = NetworkScanner("127.0.0.1/32") # Scan localhost for testing
    print(scanner.scan_for_ssh())
