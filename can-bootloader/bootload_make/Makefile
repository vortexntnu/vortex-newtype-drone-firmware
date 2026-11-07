BIN := bootload.bin
ELF := $(patsubst %.bin,%.elf,$(BIN))
MAP := $(patsubst %.bin,%.map,$(BIN))
all: build $(BIN)

HAL_SRC := $(wildcard stm32c5xx-drivers/hal/*.c)
HAL_OBJS := $(addprefix build/,$(patsubst %.c,%.o,$(notdir $(HAL_SRC))))
HAL_DEFINES := -DSTM32C542xx -DUSE_EXTERNAL_ENV
HAL_INCLUDES := -I.\
		-Iarch/cmsis/CMSIS/Core/Include\
		-Istm32c5xx-drivers/hal\
		-Istm32c5xx-drivers/ll\
		-Istm32c5xx-drivers/timebases\
		-Istm32c5xx-drivers/templates/common\
		-Istm32c5xx-dfp/Include\
		-Istm32c5xx-dfp/Include/Templates

# Add files here when you need to
SRC := main.c init.c gpio.c can.c interrupts.c boot.c flash.c silence.c
SRC_OBJS := $(addprefix build/,$(patsubst %.c,%.o,$(SRC)))

CC := arm-none-eabi-gcc

OBJS := $(SRC_OBJS) $(HAL_OBJS) build/system_stm32c5xx.o build/startup_stm32c542xx.o
# Flags mostly extracted from build logs of ide
# Set -g3 -O0 for debug, -g0 -Os for optimize
FLAGS := -g0 -Os -fdata-sections -ffunction-sections -fstack-usage\
	 -mcpu=cortex-m33 -mfpu=fpv5-sp-d16 -mfloat-abi=hard -mthumb\
	 -std=gnu11 -Wall -Wno-comment -Werror=implicit-function-declaration -Wstrict-aliasing\
	 --specs=nano.specs --specs=nosys.specs
#	 -Wl,--gc-sections # this is a linker option? in the ide it is included in the compile options
# 	                   # anyway, it seems they don't know what they are doing, some options were duplicated in ide
# Don't know how many of these that are actually needed,
# --gc-sections appeared twice in ide extract, don't think that does anything
# also, -lc is appearently libc, static because -static
LDFLAGS := -fdata-sections -ffunction-sections\
	   -mcpu=cortex-m33 -mfpu=fpv5-sp-d16 -mfloat-abi=hard -mthumb\
	   -Wno-comment\
	   -Wl,--gc-sections -Wl,-Map=$(MAP) -Wl,--start-group -lc -lm -Wl,--end-group\
	   -static\
	   --specs=nano.specs --specs=nosys.specs\
	   -Tstm32c5xx-dfp/Source/Templates/gcc/linker/stm32c542xc_flash.ld

build:
	mkdir -p $@

.SECONDEXPANSION:

$(HAL_OBJS): $$(patsubst build/%.o,stm32c5xx-drivers/hal/%.c,$$@) stm32c5xx-drivers/templates/common/stm32c5xx_hal_conf.h
	$(CC) $(FLAGS) $(HAL_DEFINES) $(HAL_INCLUDES) -c $< -o $@

build/system_stm32c5xx.o: stm32c5xx-dfp/Source/Templates/system_stm32c5xx.c
	$(CC) $(FLAGS) $(HAL_DEFINES) $(HAL_INCLUDES) -c $< -o $@
build/startup_stm32c542xx.o: stm32c5xx-dfp/Source/startup_stm32c542xx.c
	$(CC) $(FLAGS) $(HAL_DEFINES) $(HAL_INCLUDES) -c $< -o $@

$(SRC_OBJS): $$(notdir $$(patsubst %.o,%.c,$$@)) $(HAL_OBJS)
	$(CC) $(FLAGS) $(HAL_DEFINES) $(HAL_INCLUDES) -c $< -o $@

$(ELF): $(OBJS)
	$(CC) $(LDFLAGS) $^ -o $@

clean:
	rm -r build

.PHONY: clean

$(BIN): $(ELF)
	arm-none-eabi-objcopy -O binary $< $@

flash: $(BIN)
	st-flash --connect-under-reset write $< 0x8000000
flash-secondary: $(BIN)
	st-flash --connect-under-reset write $< 0x8020000

flash-both: flash flash-secondary

.PHONY: flash flash-secondary flash-both
