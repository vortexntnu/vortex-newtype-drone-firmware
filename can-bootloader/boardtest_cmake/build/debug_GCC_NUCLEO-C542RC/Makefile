all: flash

boardtest.bin: boardtest.elf
	arm-none-eabi-objcopy -O binary boardtest.elf boardtest.bin

flash: boardtest.bin
	st-flash --connect-under-reset write boardtest.bin 0x8000000
flash-secondary: boardtest.bin
	st-flash --connect-under-reset write boardtest.bin 0x8020000

flash-both: flash flash-secondary

.PHONY: flash flash-secondary flash-both
