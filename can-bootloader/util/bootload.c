#include <unistd.h>

#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#include <sys/socket.h>
#include <sys/ioctl.h>
#include <linux/sockios.h>
#include <linux/can.h>
#include <net/if.h>

int usage(char* pname)
{
	printf("Usage: %s <interface> <mcuname> <file>\n"
	       "Ex: %s can0 power-interface image.obj\n", pname, pname);
	exit(1);
	return 0;
}

char* pname = NULL;
int die(char* why)
{
	printf("%s: %s\n", pname, why);
	exit(1);
	return 1;
}

int errnoquit(char* what)
{
	perror(what);
	exit(1);
	return 1;
}

char* read_file(char* name, int* size)
{
	FILE* fd = fopen(name, "rb");
	if(!fd)
		errnoquit(name);
	fseek(fd, 0, SEEK_END);
	*size = ftell(fd);
	char* data = malloc(((*size + 5) / 6) * 6);
	fseek(fd, 0, SEEK_SET);
	for(int i = 1; i <= 6; ++i)
		data[((*size + 5) / 6) * 6 - i] = 0x00;
	fread(data, *size, 1, fd);
	return data;
}

int printframe(struct can_frame* frame)
{
	printf("0x%x:", frame->can_id);
	for(int i = 0; i < frame->len; ++i)
		printf(" %hhx", frame->data[i]);
	printf("\n");
	return 0;
}

struct can_frame recv_frame;

int s;
struct can_frame send_frame;
int cntleft;

struct switch_id
{
	char* board;
	long id;
} switch_ids[] =
{
	{"power", 0x30}, // et cetera
};
int board = 0;

int bl_switch(void)
{
	send_frame.can_id = switch_ids[board].id;
	send_frame.len = 8;
	((uint32_t*)send_frame.data)[0] = 0;
	write(s, &send_frame, sizeof(send_frame));

	return 0;
}

int bl_get_init(void)
{
	int nbytes = read(s, &recv_frame, sizeof(struct can_frame));
	if(recv_frame.can_id != 0x044)
		die("Did not get initial ping!");
	return 0;
}

int bl_init(void)
{
	send_frame.can_id = 0x041;
	send_frame.len = 8;
	((uint32_t*)send_frame.data)[0] = cntleft;
	write(s, &send_frame, sizeof(send_frame));

	return 0;
}

int bl_get_ack(void)
{
	int nbytes = read(s, &recv_frame, sizeof(struct can_frame));
	printframe(&recv_frame);
	if(recv_frame.can_id != 0x045)
		die("Did not get correct ready signal!\n");
	return 0;
}

int bl_write(char* data, int index)
{
	send_frame.can_id = 0x043;
	send_frame.len = 8;
	memcpy(send_frame.data, data, 6);
	((uint16_t*)send_frame.data)[3] = index;
	int rval = 0;
	for(; !rval || !~rval;)
	{
		rval = write(s, &send_frame, sizeof(send_frame));
	}

	return 0;
}

int bl_get_fin(void)
{
	int nbytes = read(s, &recv_frame, sizeof(struct can_frame));
	printframe(&recv_frame);
	if(recv_frame.can_id != 0x047)
		die("Did not get correct finish signal!\n");
	return 0;
}

int main(int argc, char** argv)
{
	if(argc < 4) usage(argv[0]);

	pname = argv[0];
	char* interface = argv[1];
	char* mcu = argv[2];
	for(board = 0; board < sizeof(switch_ids)/sizeof(switch_ids[0]); ++board)
		if(!strcmp(mcu, switch_ids[board].board))
			break;
	if(board == sizeof(switch_ids)/sizeof(switch_ids[0]))
		die("No such mcu or board");
	char* file = argv[3];
	int size = 0;
	char* data = read_file(file, &size);
	cntleft = (size + 5) / 6;

	s = socket(PF_CAN, SOCK_RAW, CAN_RAW);

	struct ifreq ifr;
	strcpy(ifr.ifr_name, interface);
	ioctl(s, SIOCGIFINDEX, &ifr);
	struct sockaddr_can addr =
	{
		.can_family = AF_CAN,
		.can_ifindex = ifr.ifr_ifindex,
	};

	if(!~bind(s, (struct sockaddr*)&addr, sizeof(addr)))
		errnoquit("bind");

	bl_switch();
	bl_get_init();
	bl_init();
	int cntdone = 0;
	for(; cntleft; --cntleft, ++cntdone)
	{
		bl_get_ack();
		bl_write(&data[cntdone*6], cntdone);
	}
	bl_get_fin();

	printf("Flash flash'd\n");

	return 0;
}
