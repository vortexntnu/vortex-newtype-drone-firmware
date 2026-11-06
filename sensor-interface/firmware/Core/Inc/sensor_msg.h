// sensor_msg.h
// Shared message type: every sensor module puts these in sensor_queue,
// and ethernet.c takes them out and sends them to the Orin.
#pragma once
#include <stdint.h>
#include "cmsis_os2.h"   // osMessageQueueId_t
#include "stim.h"        // stim_sample_t
#include "dvl.h"
#include "mag.h"
#include "bar30.h"

typedef enum {
  SENSOR_STIM,
  SENSOR_DVL,
  SENSOR_MAG,
  SENSOR_BAR30
} sensor_id_t;

typedef struct {
  sensor_id_t id;            // which sensor this came from
  uint64_t    timestamp_us;  // from timebase
  union {                    // only the member matching id is valid
    stim_sample_t  stim;
    // dvl_sample_t   dvl;
    // mag_sample_t   mag;
    // bar30_sample_t bar30;
  } data;
} sensor_msg_t;

// The queue all sensors push into. Defined and created in main.c.
extern osMessageQueueId_t sensor_queue;
