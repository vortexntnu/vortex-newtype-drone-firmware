#ifndef I2C_H_
#define I2C_H_

#include <stdint.h>

int init_i2c(void);
int i2c_read_regs(uint8_t addr, uint8_t* regs, uint8_t size);
int i2c_write_regs(uint8_t addr, uint8_t* regs, uint8_t size);

#endif
