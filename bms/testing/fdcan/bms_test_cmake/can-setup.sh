sudo slcand -o -c -s6 /dev/ttyACM1 can0
sudo ifconfig can0 txqueuelen 1000
sudo ip link set can0 up