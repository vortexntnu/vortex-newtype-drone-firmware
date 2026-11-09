#!/usr/bin/env python3
"""CANable 2.0 SLCAN monitor: receive Classical CAN and CAN FD; send both.

Commands:
  can hello       Classical CAN (up to 8 bytes)
  fd hello        CAN FD without bitrate switching
  brs hello       CAN FD with bitrate switching
  hex can *payload*
  hex fd *payload*
  hex brs *payload*
  quit
"""
import struct
import threading

import can
from can.interfaces.slcan import slcanBus

PORT = "/dev/ttyACM1"
NOMINAL_BITRATE = 500_000
DATA_BITRATE = 2_000_000
TELEMETRY_ID = 0x100
COMMAND_ID = 0x101
FD_LENGTHS = (0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64)


def show_frame(msg: can.Message) -> None:
    kind = "FD+BRS" if msg.is_fd and msg.bitrate_switch else ("FD" if msg.is_fd else "CAN")
    data = bytes(msg.data)
    print(f"\nRX {kind} ID=0x{msg.arbitration_id:X} "
          f"({'EXT' if msg.is_extended_id else 'STD'}) "
          f"len={len(data)} data={data.hex(' ').upper()}")

    if (msg.arbitration_id == TELEMETRY_ID
            and not msg.is_extended_id and msg.is_fd and len(data) == 20):
        timestamp, voltage, current, temperature, soc, flags = struct.unpack_from(
            "<IIihHB", data
        )
        print(f"  BMS: t={timestamp} ms, V={voltage / 1000:.3f} V, "
              f"I={current / 1000:.3f} A, T={temperature / 100:.2f} C, "
              f"SoC={soc / 100:.2f} %, flags=0x{flags:02X}")


def receiver(bus: can.BusABC, stop: threading.Event) -> None:
    while not stop.is_set():
        try:
            msg = bus.recv(timeout=0.2)
            if msg is not None:
                show_frame(msg)
        except can.CanError as exc:
            print(f"\nReceive error: {exc}")
            stop.set()


def parse_command(line: str) -> tuple[str, bytes] | None:
    parts = line.split(maxsplit=2)
    if len(parts) < 2:
        return None
    if parts[0].lower() == "hex" and len(parts) == 3:
        mode = parts[1].lower()
        if mode not in ("can", "fd", "brs"):
            return None
        return mode, bytes.fromhex(parts[2])
    if parts[0].lower() in ("can", "fd", "brs", "send"):
        mode = "can" if parts[0].lower() == "send" else parts[0].lower()
        return mode, line.split(maxsplit=1)[1].encode("utf-8")
    return None


def main() -> None:
    print(f"Opening CANable on {PORT} ...")
    with slcanBus(channel=f"{PORT}@115200") as bus:
        # CANable 2.0-specific extension: enables configuration for FD data bitrate.
        bus.set_bitrate(500_000)
        print("RX: all IDs, Classical CAN and CAN FD (if supported by firmware)")
        print(f"Nominal {NOMINAL_BITRATE}, FD data {DATA_BITRATE}; TX STD ID 0x{COMMAND_ID:X}")
        print("Commands: can hello | fd hello | brs hello | hex can DEADBEEF | quit")
        stop = threading.Event()
        thread = threading.Thread(target=receiver, args=(bus, stop), daemon=True)
        thread.start()
        try:
            while not stop.is_set():
                line = input("> ").strip()
                if line.lower() in ("quit", "exit", "q"):
                    break
                try:
                    parsed = parse_command(line)
                except ValueError:
                    print("Invalid hex input")
                    continue
                if parsed is None:
                    print("Use: can TEXT | fd TEXT | brs TEXT | hex can/fd/brs HEX | quit")
                    continue
                mode, payload = parsed
                is_fd = mode != "can"
                max_size = 64 if is_fd else 8
                if len(payload) > max_size:
                    print(f"{mode.upper()} payload too long: maximum {max_size} bytes")
                    continue
                if is_fd:
                    frame_size = next(size for size in FD_LENGTHS if size >= len(payload))
                    payload = payload.ljust(frame_size, b"\x00")
                message = can.Message(
                    arbitration_id=COMMAND_ID,
                    is_extended_id=False,
                    is_fd=is_fd,
                    bitrate_switch=(mode == "brs"),
                    data=payload,
                    check=True,
                )
                try:
                    bus.send(message, timeout=1.0)
                    print(f"TX submitted: {mode.upper()}, ID=0x{COMMAND_ID:X}, "
                          f"len={len(payload)}, data={payload.hex(' ').upper()}")
                except can.CanError as exc:
                    print(f"Transmit error: {exc}")
        except (KeyboardInterrupt, EOFError):
            pass
        finally:
            stop.set()
            thread.join(timeout=1.0)


if __name__ == "__main__":
    main()
