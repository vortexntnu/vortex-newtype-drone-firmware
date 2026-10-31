// to silence linker warning, do not use
int _write(int file, char *ptr, int len)
{
	return -1;
}

int _close(int file)
{
	return -1;
}

int _lseek(int file, int ptr, int dir)
{
	return -1;
}

int _read(int file, char *ptr, int len)
{
	return -1;
}
