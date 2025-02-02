dev:
	node --watch --experimental-strip-types index.ts

start:
	node --experimental-strip-types index.ts

.PHONY: dev start
