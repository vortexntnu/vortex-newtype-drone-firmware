/*
 * usb_cdc.c - minimal CDC-ACM virtual COM port for printf on STM32C5 (USB_DRD_FS, HAL2 PCD).
 *
 * The generated USB PCD is configured by mx_usb_drd_fs.c. This file supplies
 * the USB device callbacks and the CDC-ACM control/data handling.
 *
 * Endpoint plan (must match the CubeMX2 PMA table and mx_usb_drd_fs.c):
 *   EP0 IN/OUT control 64 | 0x81 bulk IN 64 | 0x02 bulk OUT 64 | 0x83 interrupt IN 16
 */
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "mx_usb_drd_fs.h"

/* ====================== HAL2 port layer ====================== */
static hal_pcd_handle_t *pcd;

static inline void port_ep_open(uint8_t ep, uint16_t mps, hal_pcd_ep_type_t type)
{
    (void)HAL_PCD_OpenEndpoint(pcd, ep, mps, type);
}
static inline void port_tx(uint8_t ep, const uint8_t *b, uint32_t n)
{
    (void)HAL_PCD_SetEndpointTransmit(pcd, ep, (uint8_t *)b, n);
}
static inline void port_rx(uint8_t ep, uint8_t *b, uint32_t n)
{
    (void)HAL_PCD_SetEndpointReceive(pcd, ep, b, n);
}
static inline void port_set_addr(uint8_t a)
{
    (void)HAL_PCD_SetDeviceAddress(pcd, a);
}
static inline void port_stall_ep0(void)
{
    (void)HAL_PCD_SetEndpointStall(pcd, 0x80);
    (void)HAL_PCD_SetEndpointStall(pcd, 0x00);
}
static inline void port_get_setup(uint8_t out[8])
{
    memcpy(out, (const void *)pcd->setup, 8);
}
static inline void port_start(void)
{
    (void)HAL_PCD_Start(pcd);
}
/* ====================== END PORT LAYER ====================== */

void usb_on_setup(void);
void usb_on_data_in(uint8_t epnum);   /* epnum without direction bit: 0 or 1 */
void usb_on_data_out(uint8_t epnum);  /* 0 or 2 */
void usb_on_reset(void);

/* ---------------- descriptors ---------------- */
static const uint8_t dev_desc[18] = {
    18, 1, 0x00, 0x02,       /* bcdUSB 2.00 */
    0x02, 0x00, 0x00, 64,    /* class CDC, EP0 size 64 */
    0x83, 0x04, 0x40, 0x57,  /* VID 0x0483, PID 0x5740 (ST VCP IDs; use your own for products) */
    0x00, 0x01, 1, 2, 0, 1   /* bcdDevice, iManufacturer, iProduct, iSerial, nConfigs */
};

static const uint8_t cfg_desc[67] = {
    9, 2, 67, 0, 2, 1, 0, 0xC0, 50,                 /* config: 2 ifaces, self-powered */
    9, 4, 0, 0, 1, 0x02, 0x02, 0x00, 0,     /* iface 0: CDC comm, ACM, 1 EP */
    5, 0x24, 0x00, 0x10, 0x01,                                 /* header */
    5, 0x24, 0x01, 0x00, 1,                                    /* call management -> data iface 1 */
    4, 0x24, 0x02, 0x02,                                            /* ACM */
    5, 0x24, 0x06, 0, 1,                                       /* union */
    7, 5, 0x83, 0x03, 16, 0, 16,                     /* EP 0x83 interrupt IN */
    9, 4, 1, 0, 2, 0x0A, 0x00, 0x00, 0,     /* iface 1: CDC data, 2 EPs */
    7, 5, 0x02, 0x02, 64, 0, 0,                      /* EP 0x02 bulk OUT */
    7, 5, 0x81, 0x02, 64, 0, 0                       /* EP 0x81 bulk IN */
};

static const char *const str_tab[3] = { NULL, "Vortex", "Vortex VCP" };

static uint8_t ep0_buf[64];
static uint8_t rx_buf[64];

static uint16_t build_string(uint8_t idx, uint8_t *o)
{
    if (idx == 0) { o[0] = 4; o[1] = 3; o[2] = 0x09; o[3] = 0x04; return 4; }
    if (idx > 2) return 0;
    const char *s = str_tab[idx];
    uint8_t n = 0;
    while (s[n] && n < 30) { o[2 + 2 * n] = (uint8_t)s[n]; o[3 + 2 * n] = 0; n++; }
    o[0] = (uint8_t)(2 + 2 * n); o[1] = 3;
    return o[0];
}

/* ---------------- state ---------------- */
static volatile uint8_t configured, dtr;
static uint8_t line_coding[7] = { 0x00, 0xC2, 0x01, 0x00, 0x00, 0x00, 0x08 }; /* 115200 8N1 */

/* ---------------- TX ring buffer ---------------- */
#define TXN 1024
static uint8_t ring[TXN];
static volatile uint16_t head, tail;
static volatile uint8_t busy, last_full;
static uint8_t pkt[64];

static void kick(void)  /* call with IRQs masked or from the USB ISR */
{
    if (busy || !configured || !dtr) return;
    uint16_t n = 0;
    while (tail != head && n < 64) { pkt[n++] = ring[tail]; tail = (uint16_t)((tail + 1) % TXN); }
    if (n == 0 && !last_full) return;
    last_full = (n == 64);   /* a full packet must be followed by a ZLP if nothing else is queued */
    busy = 1;
    port_tx(0x81, pkt, n);
}

static void push(char c)
{
    uint16_t nh = (uint16_t)((head + 1) % TXN);
    if (nh == tail) return;  /* full: drop instead of blocking */
    ring[head] = (uint8_t)c;
    head = nh;
}

int usb_cdc_write(const char *p, size_t len)
{
    for (size_t i = 0; i < len; i++) {
        if (p[i] == '\n') push('\r');
        push(p[i]);
    }
    __disable_irq();
    kick();
    __enable_irq();
    return (int)len;
}

/* ---------------- EP0 ---------------- */
static void ep0_send(const uint8_t *d, uint16_t n, uint16_t wlen)
{
    port_tx(0x80, d, n < wlen ? n : wlen);
}
static void ep0_zlp(void) { port_tx(0x80, NULL, 0); }

void usb_on_setup(void)
{
    uint8_t s[8];
    port_get_setup(s);
    uint8_t bm = s[0], req = s[1];
    uint16_t val = (uint16_t)(s[2] | (s[3] << 8));
    uint16_t len = (uint16_t)(s[6] | (s[7] << 8));

    switch (bm & 0x60) {
    case 0x00: /* standard */
        if (bm == 0x80 && req == 6) { /* GET_DESCRIPTOR */
            switch (val >> 8) {
            case 1: ep0_send(dev_desc, sizeof dev_desc, len); return;
            case 2: ep0_send(cfg_desc, sizeof cfg_desc, len); return;
            case 3: { uint16_t n = build_string((uint8_t)(val & 0xFF), ep0_buf);
                      if (n) { ep0_send(ep0_buf, n, len); return; } break; }
            default: break;
            }
            port_stall_ep0(); return;
        }
        if (bm == 0x00 && req == 5) { port_set_addr((uint8_t)(val & 0x7F)); ep0_zlp(); return; }
        if (bm == 0x00 && req == 9) { /* SET_CONFIGURATION */
            if (val == 1) {
                port_ep_open(0x81, 64, HAL_PCD_EP_TYPE_BULK);
                port_ep_open(0x02, 64, HAL_PCD_EP_TYPE_BULK);
                port_ep_open(0x83, 16, HAL_PCD_EP_TYPE_INTR);
                port_rx(0x02, rx_buf, sizeof rx_buf);
                configured = 1;
            } else { configured = 0; }
            ep0_zlp(); return;
        }
        if (bm == 0x80 && req == 8) { ep0_buf[0] = configured; ep0_send(ep0_buf, 1, len); return; }
        if (bm == 0x80 && req == 0) { ep0_buf[0] = ep0_buf[1] = 0; ep0_send(ep0_buf, 2, len); return; }
        if (req == 1 || req == 11) { ep0_zlp(); return; } /* CLEAR_FEATURE, SET_INTERFACE */
        break;
    case 0x20: /* class (CDC) */
        if (req == 0x20) { port_rx(0, ep0_buf, 7); return; }                 /* SET_LINE_CODING: data stage */
        if (req == 0x21) { ep0_send(line_coding, 7, len); return; }          /* GET_LINE_CODING */
        if (req == 0x22) { dtr = val & 1; ep0_zlp(); kick(); return; }       /* SET_CONTROL_LINE_STATE */
        if (req == 0x23) { ep0_zlp(); return; }                              /* SEND_BREAK */
        break;
    default: break;
    }
    port_stall_ep0();
}

void usb_on_data_in(uint8_t epnum)
{
    if (epnum == 0) port_rx(0, NULL, 0);     /* arm the status-stage OUT ZLP (HAL2 may do this itself) */
    else if (epnum == 1) { busy = 0; kick(); }
}

void usb_on_data_out(uint8_t epnum)
{
    if (epnum == 0) {
        if (HAL_PCD_EP_GetRxCount(pcd, 0) == sizeof line_coding) {
            memcpy(line_coding, ep0_buf, sizeof line_coding);
        }
        ep0_zlp();
    }  /* SET_LINE_CODING received */
    else if (epnum == 2) port_rx(0x02, rx_buf, sizeof rx_buf);       /* discard RX, keep EP armed */
}

void usb_on_reset(void)
{
    configured = 0; dtr = 0; busy = 0; last_full = 0;
    port_ep_open(0x00, 64, HAL_PCD_EP_TYPE_CTRL);
    port_ep_open(0x80, 64, HAL_PCD_EP_TYPE_CTRL);
}

/*
 * Callback registration is disabled in the generated HAL configuration, so
 * the HAL calls these weak default callbacks directly.
 */
void HAL_PCD_SetupStageCallback(hal_pcd_handle_t *hpcd)
{
    (void)hpcd;
    usb_on_setup();
}

void HAL_PCD_DataInStageCallback(hal_pcd_handle_t *hpcd, uint8_t epnum)
{
    (void)hpcd;
    usb_on_data_in(epnum);
}

void HAL_PCD_DataOutStageCallback(hal_pcd_handle_t *hpcd, uint8_t epnum)
{
    (void)hpcd;
    usb_on_data_out(epnum);
}

void HAL_PCD_ResetCallback(hal_pcd_handle_t *hpcd)
{
    (void)hpcd;
    usb_on_reset();
}

void usb_cdc_init(void)
{
    pcd = mx_usb_drd_fs_device_gethandle();
    if (pcd == NULL) return;
    usb_on_reset();
    port_start();
}