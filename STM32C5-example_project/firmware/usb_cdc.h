#ifndef USB_CDC_H
#define USB_CDC_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Initializes the USB_DRD_FS peripheral (via the generated mx_usb_drd_fs_device_init),
 * registers the CDC handlers and starts the device. Call once after HAL_Init()
 * and clock configuration. After this, printf() goes out over the virtual COM port. */
void usb_cdc_init(void);
int usb_cdc_write(const char *buffer, size_t length);

/* Handlers called by the HAL2 PCD callbacks (hook these up in port_register()). */
void usb_on_setup(void);
void usb_on_data_in(uint8_t epnum);   /* epnum without direction bit: 0 or 1 */
void usb_on_data_out(uint8_t epnum);  /* 0 or 2 */
void usb_on_reset(void);

#ifdef __cplusplus
}
#endif

#endif /* USB_CDC_H */