# NODE server to serve SVG for NL queries

## Start Server

Start the website server:

```bash
./run_server.sh
```

In a new shell, start the nl server

```bash
./run_nl_server.sh
```

Start the nodejs svg server

```bash
cd static
npm run dev:nodemon
```

## Fetch SVG

Get an example svg from a [test page](http://localhost:3030/nodejs/query?q=san+jose+population).
