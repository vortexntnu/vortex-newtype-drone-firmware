#include "encode_decode_test.h"
#include "CAN.h"
#include "CAN_protocol.h"
#include "stm32c5xx_hal.h"
#include "stm32c5xx_hal_def.h"
#include "stm32c5xx_hal_gpio.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

uint32_t now = 0;
uint32_t last_attempt = 0;
bool button_ready = true;
bool transmit = true;
FdcanPayload telemetry = {0};

bool init = false;

void init_fdata(void) {
    // CAN initalization
    if (!CAN_init()) {
        printf("FDCAN initialization FAILED...\r\n");
        return;
    }

    printf("CAN initialized successfully\r\n");
    // Other data
    telemetry.timestamp_ms    = 200;
    telemetry.pack_voltage_mV = 48000;      // 48.00 V
    telemetry.pack_current_mA = 1003;       // 1
    telemetry.temperature_C   = 5633;
    telemetry.soc_percent     = 7534;
    telemetry.valid_flags     = 0x0F;
    init = true;
}


bool _tx_mode(void) {
    uint8_t payload[20] = {0};
    
    CAN_protocol_gen_payload(
        payload, telemetry.timestamp_ms, telemetry.pack_voltage_mV,
        telemetry.pack_current_mA, telemetry.temperature_C,
        telemetry.soc_percent, telemetry.valid_flags);

    if (CAN_send(0x100, payload)) {
        printf("CAN TX queued: ID=0x000\r\n");
        return true;
    }

    printf("CAN TX failed!\r\n");
    return false;
}

bool _rx_mode(void) {
    if ((uint32_t)(now - last_attempt) >= CAN_TX_INTERVAL_MS) {
        hal_fdcan_rx_header_t rx_header;
        uint8_t rx_data[64] = {0};

        if (!CAN_recieve(&rx_header, rx_data)) {
            return false;
        }

        FdcanPayload data = {0};
        bool decoded = CAN_protocol_decode_telemetric_msg(rx_data, 20, &data);

        if (!decoded) {
            printf("src_data or dst_data may be NULL, or src_len is not the right "
                    "size\n");
            return false;
        }
        
        printf("Received CAN message!\r\n");

        for (size_t i = 0; i < 20; i++)
        {
            printf("%02X ", (unsigned int)rx_data[i]);
        }

        printf("\r\n");

        int temperature_C = data.temperature_C;
        int temperature_magnitude =
            temperature_C < 0 ? -temperature_C : temperature_C;
        printf("Decoded telemetry:\n\r"
            "| Timestamp: %lu ms | Pack voltage: %lu mV | Pack current: %ld mA "
            "|\n\r"
            "| Temperature: %s%d.%02d C | State of charge: %u.%02u%% | Valid "
            "flags: 0x%02X |\n\r",
            (unsigned long)data.timestamp_ms,
            (unsigned long)data.pack_voltage_mV, (long)data.pack_current_mA,
            temperature_C < 0 ? "-" : "", temperature_magnitude / 100,
            temperature_magnitude % 100,
            (unsigned int)(data.soc_percent / 100),
            (unsigned int)(data.soc_percent % 100),
            (unsigned int)data.valid_flags
        );
        
        return true;
    }

    return false;
}

void can_app(void) {
    if (!init)
        return;

    now = HAL_GetTick();

    if (button_ready &&
        HAL_GPIO_ReadPin(HAL_GPIOC, HAL_GPIO_PIN_13) == HAL_GPIO_PIN_RESET)
    {
        HAL_Delay(30);

        if (HAL_GPIO_ReadPin(HAL_GPIOC, HAL_GPIO_PIN_13) == HAL_GPIO_PIN_RESET)
        {
            transmit = !transmit;
            button_ready = false;

            printf("Mode: %s\r\n",
                transmit ? "TRANSMIT" : "RECEIVE");
        }
    }

    if (!button_ready &&
        HAL_GPIO_ReadPin(HAL_GPIOC, HAL_GPIO_PIN_13) == HAL_GPIO_PIN_SET)
    {
        HAL_Delay(30);

        if (HAL_GPIO_ReadPin(HAL_GPIOC, HAL_GPIO_PIN_13) == HAL_GPIO_PIN_SET)
        {
            button_ready = true;
        }
    }

    bool status = false;
    if (transmit) {
        if ((uint32_t)(now - last_attempt) >= CAN_TX_INTERVAL_MS) {
            last_attempt = now;
            status = _tx_mode();
        }
    } else {
        status = _rx_mode();
    }

    hal_gpio_pin_state_t pin_state =
        transmit ? HAL_GPIO_PIN_RESET : HAL_GPIO_PIN_SET;
        HAL_GPIO_WritePin(HAL_GPIOA, HAL_GPIO_PIN_5, pin_state);

    if (status) {
        last_attempt = now;
        HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
        HAL_Delay(TX_LED_PULSE_MS);
        HAL_GPIO_TogglePin(HAL_GPIOA, HAL_GPIO_PIN_5);
    }
}