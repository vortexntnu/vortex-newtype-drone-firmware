BIN := bootload.bin
flash: $(BIN)
	st-flash --connect-under-reset write $< 0x8000000
flash-secondary: $(BIN)
	st-flash --connect-under-reset write $< 0x8020000

flash-both: flash flash-secondary

.PHONY: flash flash-secondary flash-both
