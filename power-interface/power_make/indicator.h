#ifndef INDICATOR_H_
#define INDICATOR_H_

#include <stdint.h>

int indicator_send(uint8_t r, uint8_t g, uint8_t b);
int indicator_send_done(void);

#endif
