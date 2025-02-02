dev:
	node --watch --experimental-strip-types server.ts

start:
	node --experimental-strip-types server.ts

.PHONY: dev start
